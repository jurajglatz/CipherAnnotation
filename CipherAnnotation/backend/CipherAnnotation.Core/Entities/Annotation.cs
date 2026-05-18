using CipherAnnotation.Core.Enums;

namespace CipherAnnotation.Core.Entities;

/// <summary>
/// Unified annotation. Self-references via <see cref="ParentId"/> for
/// arbitrary nesting and via <see cref="TranscriptionRefId"/> for Symbol-type
/// annotations that point at a Text-type sibling in the same document.
/// </summary>
public class Annotation
{
    public Guid Id { get; set; }

    public required Guid PageId { get; set; }

    public Guid? ParentId { get; set; }

    public required Guid CaptionId { get; set; }

    public required AnnotationType Type { get; set; }

    /// <summary>Free-text content. Optional for any type.</summary>
    public string? Content { get; set; }

    /// <summary>Free-text transcription. Cipher type only.</summary>
    public string? Transcription { get; set; }

    /// <summary>FK to a Text-type annotation in the same document. Symbol type only.</summary>
    public Guid? TranscriptionRefId { get; set; }

    /// <summary>FK to a canonical <see cref="Entities.Symbol"/> drawing. Symbol type only.</summary>
    public Guid? SymbolId { get; set; }

    public required float Orientation { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Page? Page { get; set; }

    public Annotation? Parent { get; set; }

    public ICollection<Annotation> Children { get; set; } = [];

    public Caption? Caption { get; set; }

    public Annotation? TranscriptionRef { get; set; }

    public ICollection<Annotation> ReferencedBy { get; set; } = [];

    public Symbol? Symbol { get; set; }

    public BoundingBox? BoundingBox { get; set; }
}
