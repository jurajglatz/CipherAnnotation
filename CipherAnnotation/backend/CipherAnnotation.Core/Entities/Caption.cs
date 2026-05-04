namespace CipherAnnotation.Core.Entities;

/// <summary>
/// Per-document caption (named bucket) used to label annotations
/// (e.g. "Section", "Pair", "Element", or any user-added name).
/// </summary>
public class Caption
{
    public Guid Id { get; set; }

    public required Guid DocumentId { get; set; }

    public required string Name { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Document? Document { get; set; }

    public ICollection<Annotation> Annotations { get; set; } = [];
}
