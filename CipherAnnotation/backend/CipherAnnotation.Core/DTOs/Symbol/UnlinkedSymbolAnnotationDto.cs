using CipherAnnotation.Core.DTOs.Annotation;

namespace CipherAnnotation.Core.DTOs.Symbol;

/// <summary>
/// A Symbol-typed annotation that has not yet been promoted to a canonical
/// <see cref="Entities.Symbol"/>. Surfaced on the Symbols page so the user can
/// still see, group, and caption these drawings even though no shared Symbol
/// row exists for them.
/// </summary>
public class UnlinkedSymbolAnnotationDto
{
    public required Guid AnnotationId { get; init; }
    public required string? Content { get; init; }
    public required Guid DocumentId { get; init; }
    public required string DocumentTitle { get; init; }
    public required Guid PageId { get; init; }
    public required int PageNumber { get; init; }
    public required BoundingBoxDto BoundingBox { get; init; }
    public required DateTime CreatedAt { get; init; }
}
