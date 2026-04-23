namespace CipherAnnotation.Core.DTOs.Symbol;

/// <summary>
/// Data transfer object for symbol information.
/// </summary>
public record SymbolDto
{
    /// <summary>
    /// Gets or sets the unique identifier for the symbol.
    /// </summary>
    public required Guid Id { get; init; }

    /// <summary>
    /// Gets or sets the code or identifier for the symbol.
    /// </summary>
    public required string Code { get; init; }

    /// <summary>
    /// Gets or sets the URL to the preview image of the symbol.
    /// </summary>
    public string? PreviewImageUrl { get; init; }

    /// <summary>
    /// Gets or sets the date and time when the symbol was created.
    /// </summary>
    public required DateTime CreatedAt { get; init; }
}
