namespace CipherAnnotation.Core.DTOs.Document;

/// <summary>
/// Data transfer object for document information.
/// </summary>
public record DocumentDto
{
    /// <summary>
    /// Gets or sets the unique identifier for the document.
    /// </summary>
    public required Guid Id { get; init; }

    /// <summary>
    /// Gets or sets the title of the document.
    /// </summary>
    public required string Title { get; init; }

    /// <summary>
    /// Gets or sets the description of the document.
    /// </summary>
    public string? Description { get; init; }

    /// <summary>
    /// Gets or sets the origin country of the document.
    /// </summary>
    public string? OriginCountry { get; init; }

    /// <summary>
    /// Gets or sets the author of the document.
    /// </summary>
    public string? Author { get; init; }

    /// <summary>
    /// Gets or sets the language of the document.
    /// </summary>
    public string? Language { get; init; }

    /// <summary>
    /// Gets or sets the visibility level of the document.
    /// </summary>
    public required string Visibility { get; init; }

    /// <summary>
    /// Gets or sets the unique identifier of the document owner.
    /// </summary>
    public required Guid OwnerId { get; init; }

    /// <summary>
    /// Gets or sets the name of the document owner.
    /// </summary>
    public required string OwnerName { get; init; }

    /// <summary>
    /// Gets or sets the date and time when the document was created.
    /// </summary>
    public required DateTime CreatedAt { get; init; }

    /// <summary>
    /// Gets or sets the date and time when the document was last updated.
    /// </summary>
    public required DateTime UpdatedAt { get; init; }

    /// <summary>
    /// Gets or sets the total number of pages in the document.
    /// </summary>
    public required int PageCount { get; init; }

    /// <summary>
    /// Gets or sets the thumbnail URL (first page image) for the document.
    /// </summary>
    public string? ThumbnailUrl { get; init; }
}
