namespace CipherAnnotation.Core.Entities;

/// <summary>
/// A persisted record of a preprocess batch applied to a page. Enables per-page
/// backend undo/redo by keeping the resulting image blob for each historical step.
/// </summary>
public class PreprocessHistoryEntry
{
    public Guid Id { get; set; }

    public required Guid PageId { get; set; }

    /// <summary>Monotonically increasing position within the page's history (1-based).</summary>
    public required int Sequence { get; set; }

    /// <summary>JSON-serialized list of <see cref="DTOs.Page.PreprocessOperation"/>.</summary>
    public required string OperationsJson { get; set; }

    /// <summary>Blob produced by applying this batch. Null only if this entry represents the original image state.</summary>
    public Guid? ResultBlobId { get; set; }

    /// <summary>Blob that was current before this batch was applied (the "undo target"). Null means "original image".</summary>
    public Guid? PreviousBlobId { get; set; }

    public int ResultWidth { get; set; }

    public int ResultHeight { get; set; }

    public DateTime AppliedAt { get; set; } = DateTime.UtcNow;

    public Page? Page { get; set; }

    public FileBlob? ResultBlob { get; set; }
}
