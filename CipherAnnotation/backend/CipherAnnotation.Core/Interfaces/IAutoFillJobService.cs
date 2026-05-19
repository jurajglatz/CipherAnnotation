using CipherAnnotation.Core.Common;
using CipherAnnotation.Core.DTOs.Symbol;

namespace CipherAnnotation.Core.Interfaces;

/// <summary>
/// Background tracker for symbol auto-fill jobs. Endpoints enqueue work and
/// return immediately; the UI polls <see cref="ListAsync"/> to surface per-page
/// progress in a notification center.
/// </summary>
public interface IAutoFillJobService
{
    Task<ServiceResult<StartAutoFillJobResponse>> StartAsync(
        AutoFillScope scope, Guid scopeId, Guid currentUserId,
        CancellationToken cancellationToken = default);

    ServiceResult<IReadOnlyList<AutoFillJobDto>> List(Guid currentUserId);

    ServiceResult Dismiss(Guid jobId, Guid currentUserId);

    ServiceResult DismissAllCompleted(Guid currentUserId);
}
