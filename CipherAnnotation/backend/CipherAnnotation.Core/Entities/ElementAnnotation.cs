using CipherAnnotation.Core.Enums;

namespace CipherAnnotation.Core.Entities;

/// <summary>
/// Represents an individual element (plaintext or ciphertext) annotation.
/// </summary>
public class ElementAnnotation
{
    /// <summary>
    /// Gets or sets the unique identifier for the element annotation.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Gets or sets the unique identifier of the pair this element belongs to.
    /// </summary>
    public required Guid PairId { get; set; }

    /// <summary>
    /// Gets or sets the unique identifier of the associated symbol (for ciphertext elements).
    /// </summary>
    public Guid? SymbolId { get; set; }

    /// <summary>
    /// Gets or sets the type of element (plaintext or ciphertext).
    /// </summary>
    public required ElementType Type { get; set; }

    /// <summary>
    /// Gets or sets the content or value of the element.
    /// </summary>
    public string? Content { get; set; }

    /// <summary>
    /// Gets or sets the transcription or interpretation of the element.
    /// </summary>
    public string? Transcription { get; set; }

    /// <summary>
    /// Gets or sets the rotation angle of the element in degrees.
    /// </summary>
    public required float Orientation { get; set; }

    /// <summary>
    /// Gets or sets the date and time when the element was created.
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Gets or sets the pair this element belongs to.
    /// </summary>
    public PairAnnotation? Pair { get; set; }

    /// <summary>
    /// Gets or sets the bounding box for this element.
    /// </summary>
    public BoundingBox? BoundingBox { get; set; }

    /// <summary>
    /// Gets or sets the associated symbol (for ciphertext elements).
    /// </summary>
    public Symbol? Symbol { get; set; }
}
