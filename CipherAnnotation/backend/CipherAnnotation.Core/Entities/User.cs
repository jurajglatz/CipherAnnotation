using CipherAnnotation.Core.Enums;

namespace CipherAnnotation.Core.Entities;

/// <summary>
/// Represents a user in the system.
/// </summary>
public class User
{
    /// <summary>
    /// Gets or sets the unique identifier for the user.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Gets or sets the email address of the user.
    /// </summary>
    public required string Email { get; set; }

    /// <summary>
    /// Gets or sets the password hash for the user.
    /// </summary>
    public string? PasswordHash { get; set; }

    /// <summary>
    /// Gets or sets the name of the user.
    /// </summary>
    public required string Name { get; set; }

    /// <summary>
    /// Gets or sets the URI to the user's avatar image.
    /// </summary>
    public string? AvatarUri { get; set; }

    /// <summary>
    /// Gets or sets the role of the user.
    /// </summary>
    public UserRole Role { get; set; } = UserRole.User;

    /// <summary>
    /// Gets or sets the date and time when the user was created.
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Gets or sets the collection of documents owned by this user.
    /// </summary>
    public ICollection<Document> OwnedDocuments { get; set; } = [];

    /// <summary>
    /// Gets or sets the collection of documents shared with this user.
    /// </summary>
    public ICollection<DocumentShare> SharedDocuments { get; set; } = [];
}
