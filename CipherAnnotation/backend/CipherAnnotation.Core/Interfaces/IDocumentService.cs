using CipherAnnotation.Core.Common;
using CipherAnnotation.Core.DTOs.Document;

namespace CipherAnnotation.Core.Interfaces;

public interface IDocumentService
{
    Task<ServiceResult<IEnumerable<DocumentDto>>> GetUserDocumentsAsync(
        Guid userId, CancellationToken cancellationToken = default);

    Task<ServiceResult<IEnumerable<DocumentDto>>> GetPublicDocumentsAsync(
        Guid? currentUserId, CancellationToken cancellationToken = default);

    Task<ServiceResult<DocumentDto>> GetByIdAsync(
        Guid documentId, Guid currentUserId, CancellationToken cancellationToken = default);

    Task<ServiceResult<DocumentDto>> CreateAsync(
        Guid ownerId,
        CreateDocumentRequest request,
        IReadOnlyList<UploadedFile> files,
        CancellationToken cancellationToken = default);

    Task<ServiceResult<DocumentDto>> UpdateAsync(
        Guid documentId, Guid currentUserId,
        UpdateDocumentRequest request, CancellationToken cancellationToken = default);

    Task<ServiceResult> DeleteAsync(
        Guid documentId, Guid currentUserId, CancellationToken cancellationToken = default);

    Task<ServiceResult<DocumentDto>> DuplicateAsync(
        Guid documentId, Guid currentUserId, CancellationToken cancellationToken = default);

    Task<ServiceResult<DocumentShareDto>> ShareAsync(
        Guid documentId, Guid currentUserId,
        ShareDocumentRequest request, CancellationToken cancellationToken = default);

    Task<ServiceResult<IEnumerable<DocumentShareDto>>> GetSharesAsync(
        Guid documentId, Guid currentUserId, CancellationToken cancellationToken = default);

    Task<ServiceResult> RemoveShareAsync(
        Guid documentId, Guid shareId, Guid currentUserId,
        CancellationToken cancellationToken = default);
}
