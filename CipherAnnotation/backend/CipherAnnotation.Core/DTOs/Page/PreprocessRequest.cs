using System.ComponentModel.DataAnnotations;

namespace CipherAnnotation.Core.DTOs.Page;

/// <summary>
/// A single preprocessing operation with optional parameters.
/// </summary>
public record PreprocessOperation
{
    [Required]
    public required string Name { get; init; }

    /// <summary>Optional parameter value for the operation (e.g. threshold level, rotation angle).</summary>
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
    public required List<PreprocessOperation> Operations { get; init; }
}
