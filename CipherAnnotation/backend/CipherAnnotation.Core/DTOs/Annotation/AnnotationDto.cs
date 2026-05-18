namespace CipherAnnotation.Core.DTOs.Annotation;

public record AnnotationDto
{
    public required Guid Id { get; init; }
    public required Guid PageId { get; init; }
    public Guid? ParentId { get; init; }
    public required Guid CaptionId { get; init; }
    public required string CaptionName { get; init; }
    public required int CaptionNumber { get; init; }
    public required string Type { get; init; }
    public string? Content { get; init; }
    public string? Transcription { get; init; }
    public Guid? TranscriptionRefId { get; init; }
    public Guid? SymbolId { get; init; }
    public required float Orientation { get; init; }
    public required BoundingBoxDto BoundingBox { get; init; }
    public required DateTime CreatedAt { get; init; }
}
