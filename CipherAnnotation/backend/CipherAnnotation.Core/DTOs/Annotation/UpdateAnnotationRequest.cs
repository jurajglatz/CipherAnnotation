using System.ComponentModel.DataAnnotations;

namespace CipherAnnotation.Core.DTOs.Annotation;

/// <summary>
/// Request object for updating annotation information.
/// </summary>
public record UpdateAnnotationRequest
{
    /// <summary>
    /// Gets or sets the label for the annotation (for sections).
    /// </summary>
    public string? Label { get; init; }

    /// <summary>
    /// Gets or sets the rotation angle of the annotation in degrees.
    /// </summary>
    public float? Orientation { get; init; }

    /// <summary>
    /// Gets or sets the bounding box coordinates for the annotation.
    /// </summary>
    public BoundingBoxDto? BoundingBox { get; init; }

    /// <summary>
    /// Gets or sets the element type (Plaintext or Ciphertext).
    /// </summary>
    public string? Type { get; init; }

    /// <summary>
    /// Gets or sets the content or value of the element.
    /// </summary>
    public string? Content { get; init; }

    /// <summary>
    /// Gets or sets the transcription or interpretation of the element.
    /// </summary>
    public string? Transcription { get; init; }

    /// <summary>
    /// Gets or sets the unique identifier of the associated symbol (for ciphertext elements).
    /// </summary>
    public Guid? SymbolId { get; init; }

    /// <summary>
    /// Gets or sets the order of the pair within the section.
    /// </summary>
    public int? Order { get; init; }

    /// <summary>
    /// Gets or sets the new parent section id (for reparenting a pair).
    /// </summary>
    public Guid? SectionId { get; init; }

    /// <summary>
    /// Gets or sets the new parent pair id (for reparenting an element).
    /// </summary>
    public Guid? PairId { get; init; }
}
