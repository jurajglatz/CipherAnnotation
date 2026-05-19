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

    /// <summary>
    /// Runs YOLO auto-annotation on the page. When
    /// <paramref name="replaceExisting"/> is true, every existing annotation
    /// on the page is deleted before detections are added — used when the UI
    /// has confirmed with the user that re-running auto-annotation should
    /// discard prior work on that page.
    /// </summary>
    Task<ServiceResult<IEnumerable<AnnotationDto>>> AutoAnnotateAsync(
        Guid pageId, Guid currentUserId, bool replaceExisting = false,
        CancellationToken cancellationToken = default);

    Task<ServiceResult<AutoAnnotateAllResponse>> AutoAnnotateAllAsync(
        Guid documentId, Guid currentUserId, Guid? excludePageId = null,
        bool replaceExisting = false,
        CancellationToken cancellationToken = default);
}
