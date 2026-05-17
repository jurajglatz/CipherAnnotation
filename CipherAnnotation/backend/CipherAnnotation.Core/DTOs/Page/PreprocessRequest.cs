using System.ComponentModel.DataAnnotations;

namespace CipherAnnotation.Core.DTOs.Page;

/// <summary>
/// A single preprocessing operation with optional parameters.
/// </summary>
public record PreprocessOperation
{
    [Required]
    [StringLength(64, MinimumLength = 1)]
    public required string Name { get; init; }

    /// <summary>Optional parameter value for the operation (e.g. threshold level, rotation angle).</summary>
    [Range(-10_000f, 10_000f)]
    public float? Value { get; init; }
}

/// <summary>
/// Request object for image preprocessing operations.
/// </summary>
public record PreprocessRequest
{
    /// <summary>
    /// Gets or sets the list of preprocessing operations to apply.
    /// </summary>
    [Required]
    [MinLength(1)]
    [MaxLength(64)]
    public required List<PreprocessOperation> Operations { get; init; }
}
