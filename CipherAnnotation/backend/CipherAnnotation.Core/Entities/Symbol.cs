namespace CipherAnnotation.Core.Entities;

/// <summary>
/// Canonical drawn symbol. Many <see cref="Annotation"/>s of
/// <c>Type=Symbol</c> may reference the same <see cref="Symbol"/> via
/// <see cref="Annotation.SymbolId"/>. The drawing is an immutable PNG stored
/// in <see cref="FileBlob"/>; the textual <see cref="Content"/> is editable
/// by the owner (and will eventually be auto-filled by handwriting
/// recognition).
/// </summary>
public class Symbol
{
    public Guid Id { get; set; }

    public required Guid OwnerUserId { get; set; }

    public string? Content { get; set; }

    public required Guid ImageBlobId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User? Owner { get; set; }

    public FileBlob? ImageBlob { get; set; }

    public ICollection<Annotation> Annotations { get; set; } = [];
}
