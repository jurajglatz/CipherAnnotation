using System.ComponentModel.DataAnnotations;

namespace CipherAnnotation.Core.DTOs.Export;

/// <summary>
/// Request object for exporting document annotations.
/// </summary>
public record ExportRequest
{
    /// <summary>
    /// Gets or sets the list of document IDs to export.
    /// </summary>
    [Required]
    public required List<Guid> DocumentIds { get; init; }

    /// <summary>
    /// Gets or sets the export format (e.g., "COCO" or "YOLO").
    /// </summary>
    [Required]
    [RegularExpression("^(COCO|YOLO|TFRECORD)$")]
    public required string Format { get; init; }

    /// <summary>
    /// Gets or sets the train-test split ratio (default 0.8).
    /// </summary>
    [Range(0.0, 1.0)]
    public float TrainTestSplit { get; init; } = 0.8f;
}
