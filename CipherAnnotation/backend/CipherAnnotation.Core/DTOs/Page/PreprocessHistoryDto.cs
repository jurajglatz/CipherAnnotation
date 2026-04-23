namespace CipherAnnotation.Core.DTOs.Page;

/// <summary>
/// One entry in the per-page preprocess history, as returned to the client.
/// </summary>
public record PreprocessHistoryEntryDto
{
    public required Guid Id { get; init; }

    public required int Sequence { get; init; }

    public required List<PreprocessOperation> Operations { get; init; }

    public required DateTime AppliedAt { get; init; }

    public required bool IsCurrent { get; init; }
}

/// <summary>
/// Response for history-state queries and undo/redo operations. Includes the updated
/// page state so the frontend can refresh its view without an extra round-trip.
/// </summary>
public record PreprocessHistoryStateDto
{
    public required PageDto Page { get; init; }

    public required List<PreprocessHistoryEntryDto> Entries { get; init; }

    public required bool CanUndo { get; init; }

    public required bool CanRedo { get; init; }
}

/// <summary>
/// Request to apply a preprocess batch to every page of a document. Operations are chained
/// onto each page's current state (they do not reset existing preprocessing).
/// </summary>
public record ApplyPreprocessToAllRequest
{
    public required List<PreprocessOperation> Operations { get; init; }
}

public record ApplyPreprocessToAllResponse
{
    public required List<PageDto> Pages { get; init; }

    public required int AppliedCount { get; init; }

    public required int FailedCount { get; init; }
}
