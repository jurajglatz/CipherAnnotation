using CipherAnnotation.Core.Common;
using CipherAnnotation.Core.DTOs.Annotation;

namespace CipherAnnotation.Core.Interfaces;

public interface IAnnotationService
{
    Task<ServiceResult<IEnumerable<AnnotationDto>>> ListForPageAsync(
        Guid pageId, Guid currentUserId, CancellationToken cancellationToken = default);

    Task<ServiceResult<AnnotationDto>> CreateAsync(
        Guid pageId, Guid currentUserId,
        CreateAnnotationRequest request, CancellationToken cancellationToken = default);

    Task<ServiceResult<AnnotationDto>> UpdateAsync(
        Guid pageId, Guid annotationId, Guid currentUserId,
        UpdateAnnotationRequest request, CancellationToken cancellationToken = default);

    Task<ServiceResult> DeleteAsync(
        Guid pageId, Guid annotationId, Guid currentUserId, CancellationToken cancellationToken = default);

    Task<ServiceResult<BoundingBoxDto>> UpdateBoundingBoxAsync(
        Guid pageId, Guid annotationId, Guid currentUserId,
        BoundingBoxDto request, CancellationToken cancellationToken = default);

    Task<ServiceResult<IEnumerable<DocumentAnnotationItemDto>>> ListForDocumentAsync(
        Guid documentId, Guid currentUserId, string? type, Guid? currentPageId,
        Guid? parentId, bool rootOnly,
        CancellationToken cancellationToken = default);

    Task<ServiceResult<IEnumerable<AnnotationDto>>> AutoAnnotateAsync(
        Guid pageId, Guid currentUserId, CancellationToken cancellationToken = default);

    Task<ServiceResult<AutoAnnotateAllResponse>> AutoAnnotateAllAsync(
        Guid documentId, Guid currentUserId, Guid? excludePageId = null,
        CancellationToken cancellationToken = default);
}
