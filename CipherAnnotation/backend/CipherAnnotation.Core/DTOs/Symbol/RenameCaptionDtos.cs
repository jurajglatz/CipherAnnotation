namespace CipherAnnotation.Core.DTOs.Symbol;

public class RenameCaptionRequest
{
    public string? Content { get; set; }
}

public class RenameCaptionByContentRequest
{
    public string? OldContent { get; set; }
    public string? NewContent { get; set; }
}

public class RenameCaptionResult
{
    public required string? OldContent { get; init; }
    public required string? NewContent { get; init; }
    public required int Updated { get; init; }
    public int SymbolsUpdated { get; init; }
    public int AnnotationsUpdated { get; init; }
}
