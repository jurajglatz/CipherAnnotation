namespace CipherAnnotation.Core.DTOs.Annotation;

public record DocumentAnnotationItemDto
{
    public required Guid Id { get; init; }
    public required Guid PageId { get; init; }
    public required int PageNumber { get; init; }
    public string? Content { get; init; }
    public required string CaptionLabel { get; init; }
    public required int CaptionNumber { get; init; }
}
