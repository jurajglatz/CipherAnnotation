namespace CipherAnnotation.Core.Entities;

/// <summary>
/// Represents a pair annotation (plaintext-ciphertext pair) within a section.
/// </summary>
public class PairAnnotation
{
    /// <summary>
    /// Gets or sets the unique identifier for the pair annotation.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Gets or sets the unique identifier of the section this pair belongs to.
    /// </summary>
    public required Guid SectionId { get; set; }

    /// <summary>
    /// Gets or sets the order of this pair within the section.
    /// </summary>
    public required int Order { get; set; }

    /// <summary>
    /// Gets or sets the rotation angle of the pair in degrees.
    /// </summary>
    public required float Orientation { get; set; }

    /// <summary>
    /// Gets or sets the date and time when the pair was created.
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Gets or sets the section this pair belongs to.
    /// </summary>
    public SectionAnnotation? Section { get; set; }

    /// <summary>
    /// Gets or sets the bounding box for this pair.
    /// </summary>
    public BoundingBox? BoundingBox { get; set; }

    /// <summary>
    /// Gets or sets the collection of element annotations in this pair.
    /// </summary>
    public ICollection<ElementAnnotation> ElementAnnotations { get; set; } = [];
}
