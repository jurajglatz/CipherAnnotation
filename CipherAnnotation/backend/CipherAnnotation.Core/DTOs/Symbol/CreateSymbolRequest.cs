using System.ComponentModel.DataAnnotations;

namespace CipherAnnotation.Core.DTOs.Symbol;

/// <summary>
/// Parameters for creating a Symbol. The PNG bytes are passed separately by
/// the controller after reading the uploaded file.
/// </summary>
public record CreateSymbolRequest
{
    [StringLength(2000)]
    public string? Content { get; init; }
}
