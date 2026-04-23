using CipherAnnotation.Core.Enums;

namespace CipherAnnotation.Core.Entities;

/// <summary>
/// Represents a document share relationship between a document and a user.
/// </summary>
public class DocumentShare
{
    /// <summary>
    /// Gets or sets the unique identifier for the share record.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Gets or sets the unique identifier of the shared document.
    /// </summary>
    public required Guid DocumentId { get; set; }

    /// <summary>
    /// Gets or sets the unique identifier of the user the document is shared with.
    /// </summary>
    public required Guid UserId { get; set; }

    /// <summary>
    /// Gets or sets the permission type granted to the user.
    /// </summary>
    public required PermissionType Permission { get; set; }

    /// <summary>
    /// Gets or sets the date and time when the document was shared.
    /// </summary>
    public DateTime SharedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Gets or sets the shared document.
    /// </summary>
    public Document? Document { get; set; }

    /// <summary>
    /// Gets or sets the user the document is shared with.
    /// </summary>
    public User? User { get; set; }
}
