using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using CipherAnnotation.Core.Entities;
using CipherAnnotation.Core.Enums;
using CipherAnnotation.Core.Interfaces;
using CipherAnnotation.Infrastructure.Data;
using Google.Apis.Auth;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;

namespace CipherAnnotation.Infrastructure.Services.Auth;

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly AppDbContext _dbContext;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        IUserRepository userRepository,
        AppDbContext dbContext,
        IConfiguration configuration,
        ILogger<AuthService> logger)
    {
        _userRepository = userRepository;
        _dbContext = dbContext;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<User> RegisterAsync(
        string email, string password, string name,
        CancellationToken cancellationToken = default)
    {
        var existingUser = await _userRepository.GetByEmailAsync(email, cancellationToken);
        if (existingUser != null)
            throw new InvalidOperationException($"A user with email '{email}' already exists.");

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = email.ToLower(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password, GetBcryptWorkFactor()),
            Name = name,
            Role = UserRole.User,
            CreatedAt = DateTime.UtcNow,
        };

        await _userRepository.AddAsync(user, cancellationToken);
        await _userRepository.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("User registered successfully: {Email}", email);
        return user;
    }

    public async Task<User?> LoginAsync(
        string email, string password,
        CancellationToken cancellationToken = default)
    {
        var user = await _userRepository.GetByEmailAsync(email, cancellationToken);
        if (user == null) return null;
        if (string.IsNullOrEmpty(user.PasswordHash) ||
            !BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
            return null;

        _logger.LogInformation("User logged in successfully: {Email}", email);
        return user;
    }

    public async Task<User> GoogleLoginAsync(string googleToken, CancellationToken cancellationToken = default)
    {
        try
        {
            var payload = await GoogleJsonWebSignature.ValidateAsync(googleToken);
            var user = await _userRepository.GetByEmailAsync(payload.Email, cancellationToken);
            if (user != null) return user;

            var newUser = new User
            {
                Id = Guid.NewGuid(),
                Email = payload.Email.ToLower(),
                Name = payload.Name ?? payload.Email,
                AvatarUri = payload.Picture,
                PasswordHash = null,
                Role = UserRole.User,
                CreatedAt = DateTime.UtcNow,
            };

            await _userRepository.AddAsync(newUser, cancellationToken);
            await _userRepository.SaveChangesAsync(cancellationToken);
            return newUser;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during Google login");
            throw new InvalidOperationException("Invalid Google token.", ex);
        }
    }

    public async Task<TokenPair> IssueTokensAsync(User user, CancellationToken cancellationToken = default)
    {
        var (accessToken, expiresAt) = GenerateAccessToken(user);
        var (rawRefresh, hashed) = GenerateRefreshToken();

        _dbContext.RefreshTokens.Add(new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            TokenHash = hashed,
            ExpiresAt = DateTime.UtcNow.AddDays(GetRefreshLifetimeDays()),
            CreatedAt = DateTime.UtcNow,
        });
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new TokenPair(accessToken, rawRefresh, expiresAt);
    }

    public async Task<RefreshResult?> RefreshAsync(string refreshToken, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(refreshToken)) return null;

        var hashed = HashToken(refreshToken);
        var stored = await _dbContext.RefreshTokens
            .FirstOrDefaultAsync(t => t.TokenHash == hashed, cancellationToken);

        if (stored == null)
        {
            _logger.LogWarning("Refresh attempt with unknown token.");
            return null;
        }

        if (stored.RevokedAt != null)
        {
            _logger.LogWarning("Refresh replay detected for user {UserId}; revoking all active tokens.", stored.UserId);
            var active = await _dbContext.RefreshTokens
                .Where(t => t.UserId == stored.UserId && t.RevokedAt == null)
                .ToListAsync(cancellationToken);
            var now = DateTime.UtcNow;
            foreach (var t in active) t.RevokedAt = now;
            await _dbContext.SaveChangesAsync(cancellationToken);
            return null;
        }

        if (stored.ExpiresAt <= DateTime.UtcNow)
        {
            _logger.LogInformation("Refresh attempt with expired token for user {UserId}.", stored.UserId);
            return null;
        }

        var user = await _userRepository.GetByIdAsync(stored.UserId, cancellationToken);
        if (user == null) return null;

        var (accessToken, expiresAt) = GenerateAccessToken(user);
        var (rawRefresh, newHashed) = GenerateRefreshToken();

        var replacement = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            TokenHash = newHashed,
            ExpiresAt = DateTime.UtcNow.AddDays(GetRefreshLifetimeDays()),
            CreatedAt = DateTime.UtcNow,
        };

        var revokedAt = DateTime.UtcNow;

        // Relational providers (Postgres) get an atomic claim via a conditional
        // UPDATE inside a transaction — only one concurrent caller wins.
        // The InMemory provider used in tests supports neither transactions
        // nor ExecuteUpdate, so it falls back to tracker-based mutation (the
        // race-protection guarantees only matter against a real DB anyway).
        if (_dbContext.Database.IsRelational())
        {
            await using var tx = await _dbContext.Database.BeginTransactionAsync(cancellationToken);

            var claimed = await _dbContext.RefreshTokens
                .Where(t => t.Id == stored.Id && t.RevokedAt == null)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(t => t.RevokedAt, revokedAt)
                    .SetProperty(t => t.ReplacedByTokenId, (Guid?)replacement.Id),
                    cancellationToken);

            if (claimed == 0)
            {
                await tx.RollbackAsync(cancellationToken);
                _logger.LogInformation("Refresh rotation lost race for user {UserId}.", stored.UserId);
                return null;
            }

            _dbContext.RefreshTokens.Add(replacement);
            await _dbContext.SaveChangesAsync(cancellationToken);
            await tx.CommitAsync(cancellationToken);
        }
        else
        {
            stored.RevokedAt = revokedAt;
            stored.ReplacedByTokenId = replacement.Id;
            _dbContext.RefreshTokens.Add(replacement);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        return new RefreshResult(accessToken, rawRefresh, expiresAt, user);
    }

    public async Task RevokeRefreshTokenAsync(string refreshToken, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(refreshToken)) return;

        var hashed = HashToken(refreshToken);
        var stored = await _dbContext.RefreshTokens
            .FirstOrDefaultAsync(t => t.TokenHash == hashed, cancellationToken);

        if (stored == null || stored.RevokedAt != null) return;

        stored.RevokedAt = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private (string token, DateTime expiresAt) GenerateAccessToken(User user)
    {
        var key = _configuration["Jwt:Key"]
            ?? throw new InvalidOperationException("JWT Key is not configured.");
        var issuer = _configuration["Jwt:Issuer"];
        var audience = _configuration["Jwt:Audience"];
        var expirationMinutes = int.TryParse(_configuration["Jwt:ExpirationInMinutes"], out var mins) ? mins : 15;

        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        var expiresAt = DateTime.UtcNow.AddMinutes(expirationMinutes);

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Name, user.Name),
                new Claim(ClaimTypes.Role, user.Role.ToString()),
            },
            expires: expiresAt,
            signingCredentials: credentials);

        return (new JwtSecurityTokenHandler().WriteToken(token), expiresAt);
    }

    private int GetRefreshLifetimeDays() =>
        int.TryParse(_configuration["Jwt:RefreshTokenLifetimeDays"], out var d) ? d : 7;

    // BCrypt cost factor — each increment doubles work. 12 targets ~250ms on
    // modern server hardware; tune via Security:BcryptWorkFactor in config.
    private int GetBcryptWorkFactor() =>
        int.TryParse(_configuration["Security:BcryptWorkFactor"], out var w) && w >= 4 && w <= 31 ? w : 12;

    private static (string raw, string hash) GenerateRefreshToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        var raw = Base64UrlEncode(bytes);
        return (raw, HashToken(raw));
    }

    private static string HashToken(string raw)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(raw));
        return Convert.ToHexString(bytes);
    }

    private static string Base64UrlEncode(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
}
