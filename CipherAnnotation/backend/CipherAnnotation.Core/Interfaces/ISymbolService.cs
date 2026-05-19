using CipherAnnotation.Core.Common;
using CipherAnnotation.Core.DTOs.Symbol;

namespace CipherAnnotation.Core.Interfaces;

public interface ISymbolService
{
    Task<ServiceResult<SymbolDto>> CreateAsync(
        Guid currentUserId, string? content, byte[]? pngBytes, string fileName,
        CancellationToken cancellationToken = default);

    Task<ServiceResult<IEnumerable<SymbolDto>>> ListAsync(
        Guid currentUserId, string scope, string? contentSearch, IReadOnlyList<Guid>? documentIds,
        bool onlyUncaptioned, int take, int skip,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Lists Symbol-type annotations visible under <paramref name="scope"/>
    /// that have no canonical <see cref="Entities.Symbol"/> attached. These
    /// appear on the Symbols page alongside real symbols so users can review
    /// and group drawings that haven't been promoted yet.
    /// </summary>
    Task<ServiceResult<IEnumerable<UnlinkedSymbolAnnotationDto>>> ListUnlinkedAnnotationsAsync(
        Guid currentUserId, string scope, string? contentSearch, IReadOnlyList<Guid>? documentIds,
        bool onlyUncaptioned, int take, int skip,
        CancellationToken cancellationToken = default);

    Task<ServiceResult<IEnumerable<SymbolSuggestionDto>>> GetSuggestionsAsync(
        Guid currentUserId, string? content, int take,
        CancellationToken cancellationToken = default);

    Task<ServiceResult<SymbolDto>> GetByIdAsync(
        Guid id, Guid currentUserId, CancellationToken cancellationToken = default);

    Task<ServiceResult<SymbolDto>> UpdateAsync(
        Guid id, Guid currentUserId, string? content,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Renames the caption of the symbol with id <paramref name="id"/> and
    /// every other symbol owned by the caller that currently shares that
    /// non-empty caption. Fails for symbols whose current content is null or
    /// blank (the "uncaptioned" bucket has no shared identity to rename).
    /// </summary>
    Task<ServiceResult<RenameCaptionResult>> RenameCaptionAsync(
        Guid id, Guid currentUserId, string? newContent,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Bulk-renames a caption across every Symbol owned by the caller and
    /// every Symbol-type Annotation on a document the caller can edit. Used
    /// from the caption detail view where the user might not own any Symbol
    /// in the group yet (only annotations).
    /// </summary>
    Task<ServiceResult<RenameCaptionResult>> RenameCaptionByContentAsync(
        Guid currentUserId, string? oldContent, string? newContent,
        CancellationToken cancellationToken = default);

    Task<ServiceResult<SymbolDto>> UpdateImageAsync(
        Guid id, Guid currentUserId, byte[] pngBytes, string fileName,
        CancellationToken cancellationToken = default);

    Task<ServiceResult> DeleteAsync(
        Guid id, Guid currentUserId, CancellationToken cancellationToken = default);

    Task<ServiceResult<BlobContent>> GetImageAsync(
        Guid id, Guid currentUserId, CancellationToken cancellationToken = default);

    Task<ServiceResult<IEnumerable<SymbolOccurrenceDto>>> GetOccurrencesAsync(
        Guid id, Guid currentUserId, int take, int skip,
        CancellationToken cancellationToken = default);

    Task<ServiceResult<RecognizeSymbolResponse>> RecognizeAsync(
        Guid id, Guid currentUserId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Auto-fills empty <c>Content</c> on Symbol-typed annotations within the
    /// given page or document scope. Only fills symbols owned by the caller.
    /// Gated on the AutoContentGenerator feature flag.
    /// </summary>
    Task<ServiceResult<AutoFillContentResult>> AutoFillContentAsync(
        AutoFillScope scope, Guid scopeId, Guid currentUserId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Variant that reports per-image progress (1-based index of the image the
    /// VLM just finished). Used by the background job tracker.
    /// </summary>
    Task<ServiceResult<AutoFillContentResult>> AutoFillContentAsync(
        AutoFillScope scope, Guid scopeId, Guid currentUserId,
        IProgress<int>? progress, CancellationToken cancellationToken = default);
}
