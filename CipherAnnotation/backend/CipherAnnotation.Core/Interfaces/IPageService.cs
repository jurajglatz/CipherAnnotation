using CipherAnnotation.Core.Common;
using CipherAnnotation.Core.DTOs.Document;
using CipherAnnotation.Core.DTOs.Page;

namespace CipherAnnotation.Core.Interfaces;

public interface IPageService
{
    Task<ServiceResult<IEnumerable<PageDto>>> GetDocumentPagesAsync(
        Guid documentId, Guid currentUserId, CancellationToken cancellationToken = default);

    Task<ServiceResult<PageDto>> GetPageByIdAsync(
        Guid documentId, Guid pageId, Guid currentUserId, CancellationToken cancellationToken = default);

    Task<ServiceResult<PageDto>> PreprocessPageAsync(
        Guid documentId, Guid pageId, Guid currentUserId,
        IReadOnlyList<PreprocessOperation> operations, CancellationToken cancellationToken = default);

    Task<ServiceResult<PageDto>> ResetPreprocessingAsync(
        Guid documentId, Guid pageId, Guid currentUserId, CancellationToken cancellationToken = default);

    Task<ServiceResult<BlobContent>> GetPageImageAsync(
        Guid documentId, Guid pageId, Guid currentUserId, CancellationToken cancellationToken = default);

    Task<ServiceResult<BlobContent>> GetProcessedImageAsync(
        Guid documentId, Guid pageId, Guid currentUserId, CancellationToken cancellationToken = default);

    Task<ServiceResult<IEnumerable<PageDto>>> AddPagesAsync(
        Guid documentId, Guid currentUserId,
        IReadOnlyList<UploadedFile> files, CancellationToken cancellationToken = default);

    Task<ServiceResult<PreprocessHistoryStateDto>> GetPreprocessHistoryAsync(
        Guid documentId, Guid pageId, Guid currentUserId, CancellationToken cancellationToken = default);

    Task<ServiceResult<PreprocessHistoryStateDto>> UndoPreprocessAsync(
        Guid documentId, Guid pageId, Guid currentUserId, CancellationToken cancellationToken = default);

    Task<ServiceResult<PreprocessHistoryStateDto>> RedoPreprocessAsync(
        Guid documentId, Guid pageId, Guid currentUserId, CancellationToken cancellationToken = default);

    Task<ServiceResult<ApplyPreprocessToAllResponse>> ApplyPreprocessToAllAsync(
        Guid documentId, Guid currentUserId,
        IReadOnlyList<PreprocessOperation> operations, CancellationToken cancellationToken = default);
}
