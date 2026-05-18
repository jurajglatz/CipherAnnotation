namespace CipherAnnotation.Core.DTOs.Symbol;

public record SymbolSuggestionDto
{
    public required Guid Id { get; init; }
    public string? Content { get; init; }
    public required string ImageUrl { get; init; }
}
