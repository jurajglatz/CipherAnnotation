using System.ComponentModel.DataAnnotations;

namespace CipherAnnotation.Core.DTOs.Symbol;

public record UpdateSymbolRequest
{
    [StringLength(2000)]
    public string? Content { get; init; }
}
