namespace CipherAnnotation.Core.Entities;

/// <summary>
/// Represents a rectangular bounding box for spatial annotations.
/// </summary>
public class BoundingBox
{
    /// <summary>
    /// Gets or sets the unique identifier for the bounding box.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Gets or sets the unique identifier of the associated section annotation.
    /// </summary>
    public Guid? SectionId { get; set; }

    /// <summary>
    /// Gets or sets the unique identifier of the associated pair annotation.
    /// </summary>
    public Guid? PairId { get; set; }

    /// <summary>
    /// Gets or sets the unique identifier of the associated element annotation.
    /// </summary>
    public Guid? ElementId { get; set; }

    /// <summary>
    /// Gets or sets the X coordinate of the top-left corner in pixels.
    /// </summary>
    public required float X { get; set; }

    /// <summary>
    /// Gets or sets the Y coordinate of the top-left corner in pixels.
    /// </summary>
    public required float Y { get; set; }

    /// <summary>
    /// Gets or sets the width of the bounding box in pixels.
    /// </summary>
    public required float Width { get; set; }

    /// <summary>
    /// Gets or sets the height of the bounding box in pixels.
    /// </summary>
    public required float Height { get; set; }

    /// <summary>
    /// Gets or sets the associated section annotation.
    /// </summary>
    public SectionAnnotation? Section { get; set; }

    /// <summary>
    /// Gets or sets the associated pair annotation.
    /// </summary>
    public PairAnnotation? Pair { get; set; }

    /// <summary>
    /// Gets or sets the associated element annotation.
    /// </summary>
    public ElementAnnotation? Element { get; set; }
}
