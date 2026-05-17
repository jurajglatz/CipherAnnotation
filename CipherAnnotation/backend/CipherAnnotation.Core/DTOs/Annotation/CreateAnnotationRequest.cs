using System.ComponentModel.DataAnnotations;

namespace CipherAnnotation.Core.DTOs.Annotation;

public record CreateAnnotationRequest
{
    public Guid? ParentId { get; init; }
    public Guid? CaptionId { get; init; }

    [Required]
    [RegularExpression("^(Text|Cipher|Symbol)$")]
    public required string Type { get; init; } // "Text" | "Cipher" | "Symbol"

    [StringLength(8192)]
    public string? Content { get; init; }

    [StringLength(8192)]
    public string? Transcription { get; init; }

    public Guid? TranscriptionRefId { get; init; }

    [Range(-360f, 360f)]
    public float Orientation { get; init; }

    [Required]
    public required BoundingBoxDto BoundingBox { get; init; }
}
