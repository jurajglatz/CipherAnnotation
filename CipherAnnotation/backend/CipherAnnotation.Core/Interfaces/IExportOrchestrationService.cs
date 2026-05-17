using CipherAnnotation.Core.Common;
using CipherAnnotation.Core.DTOs.Document;
using CipherAnnotation.Core.DTOs.Export;

namespace CipherAnnotation.Core.Interfaces;

public interface IExportOrchestrationService
{
    Task<ServiceResult<ExportArtifact>> ExportCocoAsync(
        Guid currentUserId, ExportRequest request, CancellationToken cancellationToken = default);

    Task<ServiceResult<ExportArtifact>> ExportYoloAsync(
        Guid currentUserId, ExportRequest request, CancellationToken cancellationToken = default);

    Task<ServiceResult<ExportArtifact>> ExportTfRecordAsync(
        Guid currentUserId, ExportRequest request, CancellationToken cancellationToken = default);

    Task<ServiceResult<ImportResult>> ImportCocoAsync(
        Guid documentId, bool isAdmin, UploadedFile file, CancellationToken cancellationToken = default);

    Task<ServiceResult<ImportResult>> ImportYoloAsync(
        Guid documentId, bool isAdmin, IReadOnlyList<UploadedFile> files, CancellationToken cancellationToken = default);
}
