using CipherAnnotation.Core.Enums;

namespace CipherAnnotation.Core.DTOs.Auth;

/// <summary>
/// Data transfer object for user information.
/// </summary>
public record UserDto
{
    public required Guid Id { get; init; }
    public required string Email { get; init; }
    public required string Name { get; init; }
    public string? AvatarUri { get; init; }
    public UserRole Role { get; init; }
    public DateTime CreatedAt { get; init; }
}
