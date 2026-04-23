namespace CipherAnnotation.Core.DTOs.Auth;

/// <summary>
/// Response object containing authentication token and user information.
/// </summary>
public record AuthResponse
{
    /// <summary>
    /// Gets or sets the JWT token for authenticated requests.
    /// </summary>
    public required string Token { get; init; }

    /// <summary>
    /// Gets or sets the authenticated user information.
    /// </summary>
    public required UserDto User { get; init; }
}
