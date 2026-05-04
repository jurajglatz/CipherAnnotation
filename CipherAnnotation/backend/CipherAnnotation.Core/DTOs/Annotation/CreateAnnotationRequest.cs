using System.ComponentModel.DataAnnotations;

namespace CipherAnnotation.Core.DTOs.Annotation;

public record CreateAnnotationRequest
{
    public Guid? ParentId { get; init; }
    public Guid? CaptionId { get; init; }

    [Required]
    public required string Type { get; init; } // "Text" | "Cipher" | "Symbol"

    public string? Content { get; init; }
    public string? Transcription { get; init; }
    public Guid? TranscriptionRefId { get; init; }

    public float Orientation { get; init; }

    [Required]
    public required BoundingBoxDto BoundingBox { get; init; }
}
