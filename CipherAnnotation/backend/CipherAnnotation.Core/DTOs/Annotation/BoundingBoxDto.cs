namespace CipherAnnotation.Core.DTOs.Annotation;

/// <summary>
/// Data transfer object for bounding box coordinates.
/// </summary>
public record BoundingBoxDto
{
    /// <summary>
    /// Gets or sets the X coordinate of the top-left corner in pixels.
    /// </summary>
    public required float X { get; init; }

    /// <summary>
    /// Gets or sets the Y coordinate of the top-left corner in pixels.
    /// </summary>
    public required float Y { get; init; }

    /// <summary>
    /// Gets or sets the width of the bounding box in pixels.
    /// </summary>
    public required float Width { get; init; }

    /// <summary>
    /// Gets or sets the height of the bounding box in pixels.
    /// </summary>
    public required float Height { get; init; }
}
