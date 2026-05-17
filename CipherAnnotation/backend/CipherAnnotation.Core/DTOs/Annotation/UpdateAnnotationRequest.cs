using System.ComponentModel.DataAnnotations;

namespace CipherAnnotation.Core.DTOs.Annotation;

public record UpdateAnnotationRequest
{
    public Guid? ParentId { get; init; }
    public Guid? CaptionId { get; init; }

    [RegularExpression("^(Text|Cipher|Symbol)$")]
    public string? Type { get; init; }

    [StringLength(8192)]
    public string? Content { get; init; }

    [StringLength(8192)]
    public string? Transcription { get; init; }

    public Guid? TranscriptionRefId { get; init; }

    [Range(-360f, 360f)]
    public float? Orientation { get; init; }

    public BoundingBoxDto? BoundingBox { get; init; }
}
