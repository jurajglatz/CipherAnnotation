namespace CipherAnnotation.Core.DTOs.Annotation;

/// <summary>
/// Data transfer object for section annotation information.
/// </summary>
public record SectionAnnotationDto
{
    /// <summary>
    /// Gets or sets the unique identifier for the section annotation.
    /// </summary>
    public required Guid Id { get; init; }

    /// <summary>
    /// Gets or sets the unique identifier of the page this section is on.
    /// </summary>
    public required Guid PageId { get; init; }

    /// <summary>
    /// Gets or sets the label for the section (e.g., "Section A", "1").
    /// </summary>
    public string? Label { get; init; }

    /// <summary>
    /// Gets or sets the rotation angle of the section in degrees.
    /// </summary>
    public required float Orientation { get; init; }

    /// <summary>
    /// Gets or sets the bounding box for this section.
    /// </summary>
    public required BoundingBoxDto BoundingBox { get; init; }

    /// <summary>
    /// Gets or sets the date and time when the section was created.
    /// </summary>
    public required DateTime CreatedAt { get; init; }

    /// <summary>
    /// Gets or sets the collection of pair annotations within this section.
    /// </summary>
    public List<PairAnnotationDto>? PairAnnotations { get; init; }
}
