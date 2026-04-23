namespace CipherAnnotation.Core.DTOs.Document;

/// <summary>
/// Data transfer object for document share information.
/// </summary>
public record DocumentShareDto
{
    /// <summary>
    /// Gets or sets the unique identifier for the share record.
    /// </summary>
    public required Guid Id { get; init; }

    /// <summary>
    /// Gets or sets the unique identifier of the shared document.
    /// </summary>
    public required Guid DocumentId { get; init; }

    /// <summary>
    /// Gets or sets the unique identifier of the user the document is shared with.
    /// </summary>
    public required Guid UserId { get; init; }

    /// <summary>
    /// Gets or sets the email address of the user the document is shared with.
    /// </summary>
    public required string UserEmail { get; init; }

    /// <summary>
    /// Gets or sets the permission type granted to the user.
    /// </summary>
    public required string Permission { get; init; }

    /// <summary>
    /// Gets or sets the date and time when the document was shared.
    /// </summary>
    public required DateTime SharedAt { get; init; }
}
