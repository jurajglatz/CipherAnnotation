namespace CipherAnnotation.Core.DTOs.Annotation;

/// <summary>
/// Request object for creating a section annotation.
/// </summary>
public record CreateSectionRequest
{
    /// <summary>
    /// Gets or sets the label for the section (e.g., "Section A", "1").
    /// </summary>
    public string? Label { get; init; }

    /// <summary>
    /// Gets or sets the rotation angle of the section in degrees.
    /// </summary>
    public float Orientation { get; init; } = 0;

    /// <summary>
    /// Gets or sets the bounding box coordinates for the section.
    /// </summary>
    public required BoundingBoxDto BoundingBox { get; init; }
}
