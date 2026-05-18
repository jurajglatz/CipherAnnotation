namespace CipherAnnotation.Core.DTOs.Symbol;

public enum AutoFillScope
{
    Page,
    Document,
}

public record AutoFillContentRequest(AutoFillScope Scope, Guid Id);

public record AutoFillContentResult
{
    /// <summary>Total symbols considered (already-filled symbols are excluded upstream).</summary>
    public required int Candidates { get; init; }

    /// <summary>Successfully filled by the VLM.</summary>
    public required int Filled { get; init; }

    /// <summary>Skipped because the user does not own the symbol.</summary>
    public required int SkippedNotOwner { get; init; }

    /// <summary>VLM returned no usable suggestion.</summary>
    public required int SkippedNoSuggestion { get; init; }

    /// <summary>Per-symbol results, useful for the UI to show what was filled.</summary>
    public required IReadOnlyList<AutoFillContentItem> Items { get; init; }
}

public record AutoFillContentItem(Guid SymbolId, string? Suggestion, string Status);
