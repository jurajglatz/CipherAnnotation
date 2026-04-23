namespace CipherAnnotation.Core.DTOs.Annotation;

/// <summary>
/// Data transfer object for pair annotation information.
/// </summary>
public record PairAnnotationDto
{
    /// <summary>
    /// Gets or sets the unique identifier for the pair annotation.
    /// </summary>
    public required Guid Id { get; init; }

    /// <summary>
    /// Gets or sets the unique identifier of the section this pair belongs to.
    /// </summary>
    public required Guid SectionId { get; init; }

    /// <summary>
    /// Gets or sets the order of this pair within the section.
    /// </summary>
    public required int Order { get; init; }

    /// <summary>
    /// Gets or sets the rotation angle of the pair in degrees.
    /// </summary>
    public required float Orientation { get; init; }

    /// <summary>
    /// Gets or sets the bounding box for this pair.
    /// </summary>
    public required BoundingBoxDto BoundingBox { get; init; }

    /// <summary>
    /// Gets or sets the date and time when the pair was created.
    /// </summary>
    public required DateTime CreatedAt { get; init; }

    /// <summary>
    /// Gets or sets the collection of element annotations in this pair.
    /// </summary>
    public List<ElementAnnotationDto>? ElementAnnotations { get; init; }
}
