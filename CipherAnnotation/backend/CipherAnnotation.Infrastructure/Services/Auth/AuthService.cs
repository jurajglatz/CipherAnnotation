using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using CipherAnnotation.Core.Entities;
using CipherAnnotation.Core.Enums;
using CipherAnnotation.Core.Interfaces;
using Google.Apis.Auth;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;

namespace CipherAnnotation.Infrastructure.Services.Auth;

/// <summary>
/// Service implementation for authentication and authorization operations.
/// </summary>
public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        IUserRepository userRepository,
        IConfiguration configuration,
        ILogger<AuthService> logger)
    {
        _userRepository = userRepository ?? throw new ArgumentNullException(nameof(userRepository));
        _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<User> RegisterAsync(
        string email, string password, string name,
        CancellationToken cancellationToken = default)
    {
        var existingUser = await _userRepository.GetByEmailAsync(email, cancellationToken);
        if (existingUser != null)
            throw new InvalidOperationException($"A user with email '{email}' already exists.");

        var passwordHash = BCrypt.Net.BCrypt.HashPassword(password);

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = email.ToLower(),
            PasswordHash = passwordHash,
            Name = name,
            Role = UserRole.User,
            CreatedAt = DateTime.UtcNow
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

        if (string.IsNullOrEmpty(user.PasswordHash) || !BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
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
                CreatedAt = DateTime.UtcNow
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

    public Task<string> GenerateJwtToken(User user, CancellationToken cancellationToken = default)
    {
        // Keys match appsettings.json: Jwt:Key, Jwt:Issuer, Jwt:Audience, Jwt:ExpirationInMinutes
        var key = _configuration["Jwt:Key"]
            ?? throw new InvalidOperationException("JWT Key is not configured.");
        var issuer = _configuration["Jwt:Issuer"];
        var audience = _configuration["Jwt:Audience"];
        var expirationMinutes = int.TryParse(_configuration["Jwt:ExpirationInMinutes"], out var mins) ? mins : 1440;

        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Name, user.Name),
            new(ClaimTypes.Role, user.Role.ToString())
        };

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expirationMinutes),
            signingCredentials: credentials);

        return Task.FromResult(new JwtSecurityTokenHandler().WriteToken(token));
    }
}
