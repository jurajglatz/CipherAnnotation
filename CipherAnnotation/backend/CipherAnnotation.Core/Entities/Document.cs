using CipherAnnotation.Core.Enums;

namespace CipherAnnotation.Core.Entities;

/// <summary>
/// Represents a document containing scanned cipher pages.
/// </summary>
public class Document
{
    /// <summary>
    /// Gets or sets the unique identifier for the document.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Gets or sets the title of the document.
    /// </summary>
    public required string Title { get; set; }

    /// <summary>
    /// Gets or sets the description of the document.
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Gets or sets the origin country of the document.
    /// </summary>
    public string? OriginCountry { get; set; }

    /// <summary>
    /// Gets or sets the author of the document.
    /// </summary>
    public string? Author { get; set; }

    /// <summary>
    /// Gets or sets the language of the document.
    /// </summary>
    public string? Language { get; set; }

    /// <summary>
    /// Gets or sets the visibility level of the document.
    /// </summary>
    public Visibility Visibility { get; set; } = Visibility.Private;

    /// <summary>
    /// Gets or sets the unique identifier of the document owner.
    /// </summary>
    public required Guid OwnerId { get; set; }

    /// <summary>
    /// Gets or sets the date and time when the document was created.
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Gets or sets the date and time when the document was last updated.
    /// </summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Gets or sets the owner of the document.
    /// </summary>
    public User? Owner { get; set; }

    /// <summary>
    /// Gets or sets the collection of pages in this document.
    /// </summary>
    public ICollection<Page> Pages { get; set; } = [];

    /// <summary>
    /// Gets or sets the collection of shares for this document.
    /// </summary>
    public ICollection<DocumentShare> Shares { get; set; } = [];

    public ICollection<Caption> Captions { get; set; } = [];
}
