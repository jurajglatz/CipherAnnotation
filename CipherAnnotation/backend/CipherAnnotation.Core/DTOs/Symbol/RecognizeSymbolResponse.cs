namespace CipherAnnotation.Core.DTOs.Symbol;

public record RecognizeSymbolResponse
{
    public string? Content { get; init; }
    public float Confidence { get; init; }
}
