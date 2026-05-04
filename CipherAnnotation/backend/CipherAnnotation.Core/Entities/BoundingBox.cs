namespace CipherAnnotation.Core.Entities;

/// <summary>
/// Rectangular bounding box owned 1-1 by an annotation.
/// </summary>
public class BoundingBox
{
    public Guid Id { get; set; }

    public Guid? AnnotationId { get; set; }

    public required float X { get; set; }

    public required float Y { get; set; }

    public required float Width { get; set; }

    public required float Height { get; set; }

    public Annotation? Annotation { get; set; }
}
