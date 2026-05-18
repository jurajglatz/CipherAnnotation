namespace CipherAnnotation.Core.DTOs.Auth;

public record AuthResponse
{
    public required string AccessToken { get; init; }
    public required DateTime AccessTokenExpiresAt { get; init; }
    public required UserDto User { get; init; }
}
