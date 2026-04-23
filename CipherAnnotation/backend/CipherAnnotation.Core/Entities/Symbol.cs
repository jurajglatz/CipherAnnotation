namespace CipherAnnotation.Core.Entities;

/// <summary>
/// Represents a cipher symbol with its metadata and preview.
/// </summary>
public class Symbol
{
    public Guid Id { get; set; }

    public required string Code { get; set; }

    /// <summary>FK to the preview image blob stored in the database.</summary>
    public Guid? PreviewImageBlobId { get; set; }

    public FileBlob? PreviewImageBlob { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<ElementAnnotation> Elements { get; set; } = [];
}
