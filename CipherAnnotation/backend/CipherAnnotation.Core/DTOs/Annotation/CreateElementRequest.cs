using System.ComponentModel.DataAnnotations;

namespace CipherAnnotation.Core.DTOs.Annotation;

/// <summary>
/// Request object for creating an element annotation.
/// </summary>
public record CreateElementRequest
{
    /// <summary>
    /// Gets or sets the unique identifier of the associated symbol (for ciphertext elements).
    /// </summary>
    public Guid? SymbolId { get; init; }

    /// <summary>
    /// Gets or sets the type of element (plaintext or ciphertext).
    /// </summary>
    [Required]
    [RegularExpression("^(Plaintext|Ciphertext)$")]
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
    public float Orientation { get; init; } = 0;

    /// <summary>
    /// Gets or sets the bounding box coordinates for the element.
    /// </summary>
    public required BoundingBoxDto BoundingBox { get; init; }
}
