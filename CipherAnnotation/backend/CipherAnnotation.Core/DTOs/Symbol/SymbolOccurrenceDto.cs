using CipherAnnotation.Core.DTOs.Annotation;

namespace CipherAnnotation.Core.DTOs.Symbol;

public record SymbolOccurrenceDto
{
    public required Guid AnnotationId { get; init; }
    public required Guid DocumentId { get; init; }
    public required string DocumentTitle { get; init; }
    public required Guid PageId { get; init; }
    public required int PageNumber { get; init; }
    public required BoundingBoxDto BoundingBox { get; init; }
    public string? Content { get; init; }
}
