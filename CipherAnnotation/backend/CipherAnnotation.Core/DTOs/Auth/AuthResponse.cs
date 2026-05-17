namespace CipherAnnotation.Core.DTOs.Auth;

public record AuthResponse
{
    public required string AccessToken { get; init; }
    public required string RefreshToken { get; init; }
    public required DateTime AccessTokenExpiresAt { get; init; }
    public required UserDto User { get; init; }
}

public record RefreshRequest
{
    public required string RefreshToken { get; init; }
}
