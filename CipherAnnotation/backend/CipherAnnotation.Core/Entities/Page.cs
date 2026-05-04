namespace CipherAnnotation.Core.Entities;

/// <summary>
/// Represents a single page within a document.
/// </summary>
public class Page
{
    public Guid Id { get; set; }

    public required Guid DocumentId { get; set; }

    public required int PageNumber { get; set; }

    /// <summary>FK to the original image blob stored in the database.</summary>
    public required Guid ImageBlobId { get; set; }

    /// <summary>FK to the processed image blob, if preprocessing was applied.</summary>
    public Guid? ProcessedImageBlobId { get; set; }

    /// <summary>
    /// FK to the current position in the page's preprocess history. Null means the page
    /// currently shows the original image (no history applied). Enables backend undo/redo.
    /// </summary>
    public Guid? CurrentPreprocessHistoryId { get; set; }

    public required int Width { get; set; }

    public required int Height { get; set; }

    public required float Orientation { get; set; }

    public required int ResolutionDPI { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Document? Document { get; set; }

    public FileBlob? ImageBlob { get; set; }

    public FileBlob? ProcessedImageBlob { get; set; }

    public ICollection<Annotation> Annotations { get; set; } = [];

    public ICollection<PreprocessHistoryEntry> PreprocessHistory { get; set; } = [];
}
