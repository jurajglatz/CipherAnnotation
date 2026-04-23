using System.Security.Claims;
using CipherAnnotation.Core.DTOs.Auth;
using CipherAnnotation.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CipherAnnotation.API.Controllers;

/// <summary>
/// API controller for user authentication and authorization operations.
/// </summary>
[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly ILogger<AuthController> _logger;

    /// <summary>
    /// Initializes a new instance of the AuthController.
    /// </summary>
    /// <param name="authService">The authentication service.</param>
    /// <param name="logger">The logger instance.</param>
    public AuthController(IAuthService authService, ILogger<AuthController> logger)
    {
        _authService = authService ?? throw new ArgumentNullException(nameof(authService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Registers a new user account.
    /// </summary>
    /// <param name="request">The registration request containing email, password, and name.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>An AuthResponse containing the JWT token and user information.</returns>
    /// <response code="201">User registered successfully.</response>
    /// <response code="400">Invalid request or email already exists.</response>
    /// <response code="500">An internal server error occurred.</response>
    [HttpPost("register")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<AuthResponse>> RegisterAsync(
        [FromBody] RegisterRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var user = await _authService.RegisterAsync(
                request.Email,
                request.Password,
                request.Name,
                cancellationToken);

            var token = await _authService.GenerateJwtToken(user, cancellationToken);

            var response = new AuthResponse
            {
                Token = token,
                User = new UserDto
                {
                    Id = user.Id,
                    Email = user.Email,
                    Name = user.Name,
                    AvatarUri = user.AvatarUri
                }
            };

            _logger.LogInformation("User {Email} registered successfully.", user.Email);

            return StatusCode(StatusCodes.Status201Created, response);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning("Registration failed for email {Email}: {Message}", request.Email, ex.Message);
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred during user registration.");
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { message = "An error occurred during registration." });
        }
    }

    /// <summary>
    /// Authenticates a user with email and password.
    /// </summary>
    /// <param name="request">The login request containing email and password.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>An AuthResponse containing the JWT token and user information.</returns>
    /// <response code="200">User authenticated successfully.</response>
    /// <response code="400">Invalid request.</response>
    /// <response code="401">Invalid credentials.</response>
    /// <response code="500">An internal server error occurred.</response>
    [HttpPost("login")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<AuthResponse>> LoginAsync(
        [FromBody] LoginRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var user = await _authService.LoginAsync(
                request.Email,
                request.Password,
                cancellationToken);

            if (user == null)
            {
                _logger.LogWarning("Login attempt failed for email {Email}: invalid credentials.", request.Email);
                return Unauthorized(new { message = "Invalid email or password." });
            }

            var token = await _authService.GenerateJwtToken(user, cancellationToken);

            var response = new AuthResponse
            {
                Token = token,
                User = new UserDto
                {
                    Id = user.Id,
                    Email = user.Email,
                    Name = user.Name,
                    AvatarUri = user.AvatarUri
                }
            };

            _logger.LogInformation("User {Email} logged in successfully.", user.Email);

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred during login.");
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { message = "An error occurred during login." });
        }
    }

    /// <summary>
    /// Authenticates a user via Google OAuth.
    /// </summary>
    /// <param name="request">The Google login request containing the ID token.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>An AuthResponse containing the JWT token and user information.</returns>
    /// <response code="200">User authenticated successfully via Google.</response>
    /// <response code="400">Invalid request or invalid Google token.</response>
    /// <response code="500">An internal server error occurred.</response>
    [HttpPost("google-login")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<AuthResponse>> GoogleLoginAsync(
        [FromBody] GoogleLoginRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var user = await _authService.GoogleLoginAsync(request.IdToken, cancellationToken);

            var token = await _authService.GenerateJwtToken(user, cancellationToken);

            var response = new AuthResponse
            {
                Token = token,
                User = new UserDto
                {
                    Id = user.Id,
                    Email = user.Email,
                    Name = user.Name,
                    AvatarUri = user.AvatarUri
                }
            };

            _logger.LogInformation("User {Email} logged in via Google.", user.Email);

            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning("Google login failed: {Message}", ex.Message);
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred during Google login.");
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { message = "An error occurred during Google login." });
        }
    }

    /// <summary>
    /// Gets the current authenticated user's profile information.
    /// </summary>
    /// <returns>The current user's profile information.</returns>
    /// <response code="200">User profile retrieved successfully.</response>
    /// <response code="401">User is not authenticated.</response>
    /// <response code="500">An internal server error occurred.</response>
    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType(typeof(UserDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public ActionResult<UserDto> GetCurrentUser()
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("Attempted to get current user without valid claims.");
                return Unauthorized(new { message = "User claims not found." });
            }

            var email = User.FindFirstValue(ClaimTypes.Email);
            var name = User.FindFirstValue(ClaimTypes.Name);

            if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(name))
            {
                _logger.LogWarning("User {UserId} missing email or name claims.", userId);
                return Unauthorized(new { message = "User claims incomplete." });
            }

            var userDto = new UserDto
            {
                Id = Guid.Parse(userId),
                Email = email,
                Name = name
            };

            return Ok(userDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while retrieving current user.");
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { message = "An error occurred while retrieving user information." });
        }
    }
}
