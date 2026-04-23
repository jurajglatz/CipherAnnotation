namespace CipherAnnotation.Core.Entities;

/// <summary>
/// Represents an annotated section on a page that contains cipher pairs.
/// </summary>
public class SectionAnnotation
{
    /// <summary>
    /// Gets or sets the unique identifier for the section annotation.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Gets or sets the unique identifier of the page this section is on.
    /// </summary>
    public required Guid PageId { get; set; }

    /// <summary>
    /// Gets or sets the label for the section (e.g., "Section A", "1").
    /// </summary>
    public string? Label { get; set; }

    /// <summary>
    /// Gets or sets the rotation angle of the section in degrees.
    /// </summary>
    public required float Orientation { get; set; }

    /// <summary>
    /// Gets or sets the date and time when the section was created.
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Gets or sets the page this section is on.
    /// </summary>
    public Page? Page { get; set; }

    /// <summary>
    /// Gets or sets the bounding box for this section.
    /// </summary>
    public BoundingBox? BoundingBox { get; set; }

    /// <summary>
    /// Gets or sets the collection of pair annotations within this section.
    /// </summary>
    public ICollection<PairAnnotation> PairAnnotations { get; set; } = [];
}
