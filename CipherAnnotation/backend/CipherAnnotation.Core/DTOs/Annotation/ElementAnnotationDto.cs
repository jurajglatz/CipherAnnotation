namespace CipherAnnotation.Core.DTOs.Annotation;

/// <summary>
/// Data transfer object for element annotation information.
/// </summary>
public record ElementAnnotationDto
{
    /// <summary>
    /// Gets or sets the unique identifier for the element annotation.
    /// </summary>
    public required Guid Id { get; init; }

    /// <summary>
    /// Gets or sets the unique identifier of the pair this element belongs to.
    /// </summary>
    public required Guid PairId { get; init; }

    /// <summary>
    /// Gets or sets the unique identifier of the associated symbol (for ciphertext elements).
    /// </summary>
    public Guid? SymbolId { get; init; }

    /// <summary>
    /// Gets or sets the type of element (plaintext or ciphertext).
    /// </summary>
    public required string Type { get; init; }

    /// <summary>
    /// Gets or sets the content or value of the element.
    /// </summary>
    public string? Content { get; init; }

    /// <summary>
    /// Gets or sets the transcription or interpretation of the element.
    /// </summary>
    public string? Transcription { get; init; }

    /// <summary>
    /// Gets or sets the rotation angle of the element in degrees.
    /// </summary>
    public required float Orientation { get; init; }

    /// <summary>
    /// Gets or sets the bounding box for this element.
    /// </summary>
    public required BoundingBoxDto BoundingBox { get; init; }

    /// <summary>
    /// Gets or sets the code of the associated symbol.
    /// </summary>
    public string? SymbolCode { get; init; }

    /// <summary>
    /// Gets or sets the date and time when the element was created.
    /// </summary>
    public required DateTime CreatedAt { get; init; }
}
