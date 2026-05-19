namespace CipherAnnotation.Core.Interfaces;

/// <summary>
/// Suggests short textual captions ("content") for symbol crops.
/// Batched on purpose: local handwriting OCR models have a fixed startup cost
/// (loading the model), so processing N crops in one call is much cheaper than
/// N separate calls.
/// </summary>
public interface IVlmSuggestionService
{
    /// <summary>
    /// Returns a caption for each image, in the same order as the input.
    /// A <c>null</c> entry means the model declined / failed on that image.
    /// Implementations must never throw for individual-image errors — return
    /// null for that entry and log instead.
    /// </summary>
    Task<IReadOnlyList<string?>> SuggestSymbolContentsAsync(
        IReadOnlyList<byte[]> images, CancellationToken ct = default);

    /// <summary>
    /// Variant that reports per-image progress as the sidecar advances. The
    /// callback receives the 1-based index of the image just finished. Useful
    /// for the background job tracker that surfaces live progress to the UI.
    /// </summary>
    Task<IReadOnlyList<string?>> SuggestSymbolContentsAsync(
        IReadOnlyList<byte[]> images, IProgress<int>? progress,
        CancellationToken ct = default);
}
