namespace CipherAnnotation.Core.DTOs.Annotation;

/// <summary>
/// Request object for creating a pair annotation.
/// </summary>
public record CreatePairRequest
{
    /// <summary>
    /// Gets or sets the order of this pair within the section.
    /// </summary>
    public required int Order { get; init; }

    /// <summary>
    /// Gets or sets the rotation angle of the pair in degrees.
    /// </summary>
    public float Orientation { get; init; } = 0;

    /// <summary>
    /// Gets or sets the bounding box coordinates for the pair.
    /// </summary>
    public required BoundingBoxDto BoundingBox { get; init; }
}
