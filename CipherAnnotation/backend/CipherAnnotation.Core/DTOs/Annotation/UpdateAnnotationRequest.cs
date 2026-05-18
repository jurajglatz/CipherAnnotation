using System.ComponentModel.DataAnnotations;

namespace CipherAnnotation.Core.DTOs.Annotation;

public record UpdateAnnotationRequest
{
    public Guid? ParentId { get; init; }

    /// <summary>
    /// Set to true to detach the annotation from its parent (make it a root).
    /// Needed because <see cref="ParentId"/> cannot distinguish a JSON null
    /// from an omitted field.
    /// </summary>
    public bool ClearParent { get; init; }

    public Guid? CaptionId { get; init; }

    [RegularExpression("^(Text|Cipher|Symbol)$")]
    public string? Type { get; init; }

    [StringLength(8192)]
    public string? Content { get; init; }

    [StringLength(8192)]
    public string? Transcription { get; init; }

    public Guid? TranscriptionRefId { get; init; }

    public Guid? SymbolId { get; init; }

    /// <summary>
    /// Set to true to detach the annotation from its canonical symbol.
    /// Needed because <see cref="SymbolId"/> cannot distinguish a JSON null
    /// from an omitted field.
    /// </summary>
    public bool ClearSymbol { get; init; }

    [Range(-360f, 360f)]
    public float? Orientation { get; init; }

    public BoundingBoxDto? BoundingBox { get; init; }
}
