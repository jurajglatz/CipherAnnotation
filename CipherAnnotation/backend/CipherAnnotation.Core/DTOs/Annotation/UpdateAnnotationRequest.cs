namespace CipherAnnotation.Core.DTOs.Annotation;

public record UpdateAnnotationRequest
{
    public Guid? ParentId { get; init; }
    public Guid? CaptionId { get; init; }
    public string? Type { get; init; }
    public string? Content { get; init; }
    public string? Transcription { get; init; }
    public Guid? TranscriptionRefId { get; init; }
    public float? Orientation { get; init; }
    public BoundingBoxDto? BoundingBox { get; init; }
}
