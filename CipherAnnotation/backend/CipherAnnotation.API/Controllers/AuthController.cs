using System.Security.Claims;
using CipherAnnotation.Core.DTOs.Auth;
using CipherAnnotation.Core.Entities;
using CipherAnnotation.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Caching.Memory;

namespace CipherAnnotation.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IMemoryCache _cache;
    private readonly ILogger<AuthController> _logger;

    // Per-email throttle complements the per-IP rate limiter: a botnet can
    // spread credential-stuffing across many IPs but each target email is a
    // single key here.
    private const int LoginAttemptsPerEmailPerMinute = 10;
    private static readonly TimeSpan LoginEmailWindow = TimeSpan.FromMinutes(1);

    public AuthController(IAuthService authService, IMemoryCache cache, ILogger<AuthController> logger)
    {
        _authService = authService;
        _cache = cache;
        _logger = logger;
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
    public async Task<IActionResult> RefreshAsync(
        [FromBody] RefreshRequest request, CancellationToken ct = default)
    {
        var result = await _authService.RefreshAsync(request.RefreshToken, ct);
        if (result == null)
            return Unauthorized(new { message = "Invalid or expired refresh token." });

        return Ok(new AuthResponse
        {
            AccessToken = result.AccessToken,
            RefreshToken = result.RefreshToken,
            AccessTokenExpiresAt = result.AccessTokenExpiresAt,
            User = ToDto(result.User),
        });
    }

    [HttpPost("logout")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> LogoutAsync(
        [FromBody] RefreshRequest request, CancellationToken ct = default)
    {
        await _authService.RevokeRefreshTokenAsync(request.RefreshToken, ct);
        return NoContent();
    }

    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType(typeof(UserDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public IActionResult GetCurrentUser()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var email = User.FindFirstValue(ClaimTypes.Email);
        var name = User.FindFirstValue(ClaimTypes.Name);

        if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(email) || string.IsNullOrEmpty(name))
            return Unauthorized(new { message = "User claims incomplete." });

        return Ok(new UserDto
        {
            Id = Guid.Parse(userId),
            Email = email,
            Name = name,
        });
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
        return new AuthResponse
        {
            AccessToken = tokens.AccessToken,
            RefreshToken = tokens.RefreshToken,
            AccessTokenExpiresAt = tokens.AccessTokenExpiresAt,
            User = ToDto(user),
        };
    }

    private static UserDto ToDto(User user) => new()
    {
        Id = user.Id,
        Email = user.Email,
        Name = user.Name,
        AvatarUri = user.AvatarUri,
    };
}
