using System.ComponentModel.DataAnnotations;

namespace CipherAnnotation.Core.DTOs.Symbol;

/// <summary>
/// Request object for creating a new symbol.
/// </summary>
public record CreateSymbolRequest
{
    /// <summary>
    /// Gets or sets the code or identifier for the symbol.
    /// </summary>
    [Required]
    public required string Code { get; init; }
}
