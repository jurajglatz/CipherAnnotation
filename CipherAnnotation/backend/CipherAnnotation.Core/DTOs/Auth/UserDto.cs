namespace CipherAnnotation.Core.DTOs.Auth;

/// <summary>
/// Data transfer object for user information.
/// </summary>
public record UserDto
{
    /// <summary>
    /// Gets or sets the unique identifier for the user.
    /// </summary>
    public required Guid Id { get; init; }

    /// <summary>
    /// Gets or sets the email address of the user.
    /// </summary>
    public required string Email { get; init; }

    /// <summary>
    /// Gets or sets the full name of the user.
    /// </summary>
    public required string Name { get; init; }

    /// <summary>
    /// Gets or sets the URI to the user's avatar image.
    /// </summary>
    public string? AvatarUri { get; init; }
}
