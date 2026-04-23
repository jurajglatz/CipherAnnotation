namespace CipherAnnotation.Core.DTOs.Page;

/// <summary>
/// Data transfer object for page information.
/// </summary>
public record PageDto
{
    /// <summary>
    /// Gets or sets the unique identifier for the page.
    /// </summary>
    public required Guid Id { get; init; }

    /// <summary>
    /// Gets or sets the unique identifier of the document this page belongs to.
    /// </summary>
    public required Guid DocumentId { get; init; }

    /// <summary>
    /// Gets or sets the page number within the document.
    /// </summary>
    public required int PageNumber { get; init; }

    /// <summary>
    /// Gets or sets the URL to the original image of the page.
    /// </summary>
    public required string ImageUrl { get; init; }

    /// <summary>
    /// Gets or sets the URL to the processed image of the page.
    /// </summary>
    public string? ProcessedImageUrl { get; init; }

    /// <summary>
    /// Gets or sets the width of the page image in pixels.
    /// </summary>
    public required int Width { get; init; }

    /// <summary>
    /// Gets or sets the height of the page image in pixels.
    /// </summary>
    public required int Height { get; init; }

    /// <summary>
    /// Gets or sets the rotation angle of the page in degrees.
    /// </summary>
    public required float Orientation { get; init; }

    /// <summary>
    /// Gets or sets the resolution of the page in DPI (dots per inch).
    /// </summary>
    public required int ResolutionDPI { get; init; }

    /// <summary>
    /// Gets or sets the date and time when the page was created.
    /// </summary>
    public required DateTime CreatedAt { get; init; }

    /// <summary>
    /// Current position in the page's preprocess history. Null if the page is at the original
    /// image (no history applied or fully undone back to original).
    /// </summary>
    public Guid? CurrentPreprocessHistoryId { get; init; }

    /// <summary>
    /// Whether an undo step is available for this page on the backend.
    /// </summary>
    public bool CanUndoPreprocess { get; init; }

    /// <summary>
    /// Whether a redo step is available for this page on the backend.
    /// </summary>
    public bool CanRedoPreprocess { get; init; }
}
