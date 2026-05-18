using CipherAnnotation.Core.Common;
using CipherAnnotation.Core.DTOs.Symbol;

namespace CipherAnnotation.Core.Interfaces;

public interface ISymbolService
{
    Task<ServiceResult<SymbolDto>> CreateAsync(
        Guid currentUserId, string? content, byte[] pngBytes, string fileName,
        CancellationToken cancellationToken = default);

    Task<ServiceResult<IEnumerable<SymbolDto>>> ListAsync(
        Guid currentUserId, string scope, string? contentSearch, int take, int skip,
        CancellationToken cancellationToken = default);

    Task<ServiceResult<IEnumerable<SymbolSuggestionDto>>> GetSuggestionsAsync(
        Guid currentUserId, string? content, int take,
        CancellationToken cancellationToken = default);

    Task<ServiceResult<SymbolDto>> GetByIdAsync(
        Guid id, Guid currentUserId, CancellationToken cancellationToken = default);

    Task<ServiceResult<SymbolDto>> UpdateAsync(
        Guid id, Guid currentUserId, string? content,
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
}
