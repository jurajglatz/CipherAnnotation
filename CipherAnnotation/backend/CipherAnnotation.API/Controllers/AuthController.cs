using System.Security.Claims;
using CipherAnnotation.Core.DTOs.Auth;
using CipherAnnotation.Core.Entities;
using CipherAnnotation.Core.Interfaces;
using CipherAnnotation.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;

namespace CipherAnnotation.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IMemoryCache _cache;
    private readonly IConfiguration _configuration;
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<AuthController> _logger;
    private readonly AppDbContext _db;

    // The refresh token rides in an httpOnly Secure SameSite=Strict cookie so
    // a successful XSS cannot read or exfiltrate it.
    private const string RefreshCookieName = "refresh_token";

    // Per-email throttle complements the per-IP rate limiter: a botnet can
    // spread credential-stuffing across many IPs but each target email is a
    // single key here.
    private const int LoginAttemptsPerEmailPerMinute = 10;
    private static readonly TimeSpan LoginEmailWindow = TimeSpan.FromMinutes(1);

    public AuthController(
        IAuthService authService,
        IMemoryCache cache,
        IConfiguration configuration,
        IWebHostEnvironment env,
        ILogger<AuthController> logger,
        AppDbContext db)
    {
        _authService = authService;
        _cache = cache;
        _configuration = configuration;
        _env = env;
        _logger = logger;
        _db = db;
    }

    [HttpPost("register")]
    [EnableRateLimiting("auth")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> RegisterAsync(
        [FromBody] RegisterRequest request, CancellationToken ct = default)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        try
        {
            var user = await _authService.RegisterAsync(request.Email, request.Password, request.Name, ct);
            var response = await BuildAuthResponseAsync(user, ct);
            _logger.LogInformation("User {Email} registered successfully.", user.Email);
            return StatusCode(StatusCodes.Status201Created, response);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning("Registration failed for {Email}: {Message}", request.Email, ex.Message);
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("login")]
    [EnableRateLimiting("auth")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> LoginAsync(
        [FromBody] LoginRequest request, CancellationToken ct = default)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        if (!TryRecordLoginAttempt(request.Email))
        {
            _logger.LogWarning("Login throttled for {Email}: per-email limit exceeded.", request.Email);
            return StatusCode(StatusCodes.Status429TooManyRequests,
                new { message = "Too many login attempts for this account. Try again shortly." });
        }

        var user = await _authService.LoginAsync(request.Email, request.Password, ct);
        if (user == null)
        {
            _logger.LogWarning("Login failed for {Email}: invalid credentials.", request.Email);
            return Unauthorized(new { message = "Invalid email or password." });
        }

        var response = await BuildAuthResponseAsync(user, ct);
        _logger.LogInformation("User {Email} logged in.", user.Email);
        return Ok(response);
    }

    [HttpPost("google-login")]
    [EnableRateLimiting("auth-google")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> GoogleLoginAsync(
        [FromBody] GoogleLoginRequest request, CancellationToken ct = default)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        try
        {
            var user = await _authService.GoogleLoginAsync(request.IdToken, ct);
            var response = await BuildAuthResponseAsync(user, ct);
            _logger.LogInformation("User {Email} logged in via Google.", user.Email);
            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning("Google login failed: {Message}", ex.Message);
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    [EnableRateLimiting("auth-refresh")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> RefreshAsync(CancellationToken ct = default)
    {
        var refreshToken = Request.Cookies[RefreshCookieName];
        if (string.IsNullOrEmpty(refreshToken))
            return Unauthorized(new { message = "Missing refresh token." });

        var result = await _authService.RefreshAsync(refreshToken, ct);
        if (result == null)
        {
            ClearRefreshCookie();
            return Unauthorized(new { message = "Invalid or expired refresh token." });
        }

        SetRefreshCookie(result.RefreshToken);
        return Ok(new AuthResponse
        {
            AccessToken = result.AccessToken,
            AccessTokenExpiresAt = result.AccessTokenExpiresAt,
            User = ToDto(result.User),
        });
    }

    [HttpPost("logout")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> LogoutAsync(CancellationToken ct = default)
    {
        var refreshToken = Request.Cookies[RefreshCookieName];
        if (!string.IsNullOrEmpty(refreshToken))
            await _authService.RevokeRefreshTokenAsync(refreshToken, ct);
        ClearRefreshCookie();
        return NoContent();
    }

    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType(typeof(UserDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetCurrentUser(CancellationToken ct)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized(new { message = "User claims incomplete." });

        // Read from DB (not claims) so Role/CreatedAt reflect current state —
        // critical for admin promotion to take effect without re-login.
        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null) return Unauthorized(new { message = "User not found." });

        return Ok(ToDto(user));
    }

    private bool TryRecordLoginAttempt(string email)
    {
        if (string.IsNullOrWhiteSpace(email)) return true;
        var key = $"login-attempts:{email.Trim().ToLowerInvariant()}";
        var count = _cache.GetOrCreate(key, entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = LoginEmailWindow;
            return 0;
        });
        if (count >= LoginAttemptsPerEmailPerMinute) return false;
        _cache.Set(key, count + 1, LoginEmailWindow);
        return true;
    }

    private async Task<AuthResponse> BuildAuthResponseAsync(User user, CancellationToken ct)
    {
        var tokens = await _authService.IssueTokensAsync(user, ct);
        SetRefreshCookie(tokens.RefreshToken);
        return new AuthResponse
        {
            AccessToken = tokens.AccessToken,
            AccessTokenExpiresAt = tokens.AccessTokenExpiresAt,
            User = ToDto(user),
        };
    }

    private void SetRefreshCookie(string token)
    {
        var lifetimeDays = int.TryParse(_configuration["Jwt:RefreshTokenLifetimeDays"], out var d) ? d : 7;
        Response.Cookies.Append(RefreshCookieName, token, BuildCookieOptions(DateTime.UtcNow.AddDays(lifetimeDays)));
    }

    private void ClearRefreshCookie()
        => Response.Cookies.Append(RefreshCookieName, string.Empty, BuildCookieOptions(DateTime.UnixEpoch));

    private CookieOptions BuildCookieOptions(DateTimeOffset expires) => new()
    {
        HttpOnly = true,
        // Secure must be off in HTTP dev or the browser drops the cookie.
        Secure = !_env.IsDevelopment(),
        SameSite = SameSiteMode.Strict,
        Path = "/api/auth",
        Expires = expires,
    };

    private static UserDto ToDto(User user) => new()
    {
        Id = user.Id,
        Email = user.Email,
        Name = user.Name,
        AvatarUri = user.AvatarUri,
        Role = user.Role,
        CreatedAt = user.CreatedAt,
    };
}
