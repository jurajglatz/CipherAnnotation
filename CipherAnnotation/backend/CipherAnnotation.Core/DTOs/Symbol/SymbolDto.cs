namespace CipherAnnotation.Core.DTOs.Symbol;

public record SymbolDto
{
    public required Guid Id { get; init; }
    public required Guid OwnerUserId { get; init; }
    public string? Content { get; init; }
    public required string ImageUrl { get; init; }
    public required int ReferenceCount { get; init; }
    public required DateTime CreatedAt { get; init; }
}
