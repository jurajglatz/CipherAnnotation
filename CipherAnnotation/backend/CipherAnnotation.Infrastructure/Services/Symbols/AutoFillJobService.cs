using System.Collections.Concurrent;
using CipherAnnotation.Core.Common;
using CipherAnnotation.Core.DTOs.Symbol;
using CipherAnnotation.Core.Entities;
using CipherAnnotation.Core.Enums;
using CipherAnnotation.Core.Interfaces;
using CipherAnnotation.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace CipherAnnotation.Infrastructure.Services.Symbols;

/// <summary>
/// In-memory, per-process tracker for symbol-captioning jobs. Singleton so jobs
/// outlive the HTTP request that starts them; the UI polls List() to render a
/// notification dropdown with per-page progress.
/// </summary>
public class AutoFillJobService : IAutoFillJobService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<AutoFillJobService> _logger;

    private readonly ConcurrentDictionary<Guid, JobState> _jobs = new();

    public AutoFillJobService(IServiceScopeFactory scopeFactory, ILogger<AutoFillJobService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public async Task<ServiceResult<StartAutoFillJobResponse>> StartAsync(
        AutoFillScope scope, Guid scopeId, Guid currentUserId, CancellationToken cancellationToken = default)
    {
        if (currentUserId == Guid.Empty)
            return ServiceResult<StartAutoFillJobResponse>.Unauthorized();

        // Pre-compute the page list + per-page candidate counts so the bell can
        // show "X of Y" immediately, before any captioning starts.
        List<PageState> pageStates;
        await using (var startupScope = _scopeFactory.CreateAsyncScope())
        {
            var db = startupScope.ServiceProvider.GetRequiredService<AppDbContext>();
            var settings = startupScope.ServiceProvider.GetRequiredService<IAppSettingsService>();

            if (!await settings.GetBoolAsync(AppSettingKeys.AutoContentGeneratorEnabled, false, cancellationToken))
                return ServiceResult<StartAutoFillJobResponse>.Forbidden();

            bool canEdit = scope switch
            {
                AutoFillScope.Page => await db.Pages.AsNoTracking().AnyAsync(p =>
                    p.Id == scopeId &&
                    (p.Document!.OwnerId == currentUserId
                     || p.Document.Shares.Any(sh => sh.UserId == currentUserId && sh.Permission == PermissionType.Edit)),
                    cancellationToken),
                AutoFillScope.Document => await db.Documents.AsNoTracking().AnyAsync(d =>
                    d.Id == scopeId &&
                    (d.OwnerId == currentUserId
                     || d.Shares.Any(sh => sh.UserId == currentUserId && sh.Permission == PermissionType.Edit)),
                    cancellationToken),
                _ => false,
            };
            if (!canEdit) return ServiceResult<StartAutoFillJobResponse>.Forbidden();

            IQueryable<Page> pageQuery = scope == AutoFillScope.Page
                ? db.Pages.Where(p => p.Id == scopeId)
                : db.Pages.Where(p => p.DocumentId == scopeId);

            var pageInfos = await pageQuery
                .AsNoTracking()
                .OrderBy(p => p.PageNumber)
                .Select(p => new
                {
                    p.Id,
                    p.PageNumber,
                    p.DocumentId,
                    DocumentTitle = p.Document!.Title,
                    Total = p.Annotations.Count(a =>
                        a.Type == AnnotationType.Symbol
                        && (a.Content == null || a.Content == "")
                        && a.BoundingBox != null),
                })
                .ToListAsync(cancellationToken);

            pageStates = pageInfos
                .Where(p => p.Total > 0)
                .Select(p => new PageState
                {
                    PageId = p.Id,
                    PageNumber = p.PageNumber,
                    DocumentId = p.DocumentId,
                    DocumentTitle = p.DocumentTitle,
                    Total = p.Total,
                    Filled = 0,
                    Status = AutoFillPageStatus.Pending,
                })
                .ToList();
        }

        var jobId = Guid.NewGuid();
        var job = new JobState
        {
            JobId = jobId,
            UserId = currentUserId,
            Scope = scope,
            ScopeId = scopeId,
            Status = pageStates.Count == 0 ? AutoFillJobStatus.Completed : AutoFillJobStatus.Pending,
            StartedAt = DateTime.UtcNow,
            CompletedAt = pageStates.Count == 0 ? DateTime.UtcNow : null,
            Pages = pageStates,
        };
        _jobs[jobId] = job;

        if (pageStates.Count > 0)
        {
            _ = Task.Run(() => RunJobAsync(job));
        }

        return ServiceResult<StartAutoFillJobResponse>.Success(new StartAutoFillJobResponse(jobId));
    }

    private async Task RunJobAsync(JobState job)
    {
        job.Status = AutoFillJobStatus.Running;
        try
        {
            foreach (var page in job.Pages)
            {
                page.Status = AutoFillPageStatus.Running;
                try
                {
                    await using var scope = _scopeFactory.CreateAsyncScope();
                    var symbols = scope.ServiceProvider.GetRequiredService<ISymbolService>();
                    // Sidecar reports per-image (1-based) progress; surface it as
                    // a live count on the page row so the bell ticks while the
                    // model is still working through the batch.
                    var progress = new Progress<int>(n =>
                    {
                        page.Filled = Math.Min(page.Total, n);
                    });
                    var result = await symbols.AutoFillContentAsync(
                        AutoFillScope.Page, page.PageId, job.UserId, progress, CancellationToken.None);

                    if (result.IsSuccess && result.Value is not null)
                    {
                        // Settle on the actual filled count once the page is done.
                        page.Filled = result.Value.Filled;
                        page.Status = AutoFillPageStatus.Completed;
                    }
                    else
                    {
                        page.Status = AutoFillPageStatus.Failed;
                        page.Error = result.ErrorMessage ?? "Failed";
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Auto-fill job {JobId} failed on page {PageId}", job.JobId, page.PageId);
                    page.Status = AutoFillPageStatus.Failed;
                    page.Error = ex.Message;
                }
            }
            job.Status = job.Pages.Any(p => p.Status == AutoFillPageStatus.Failed)
                ? AutoFillJobStatus.Failed
                : AutoFillJobStatus.Completed;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Auto-fill job {JobId} crashed", job.JobId);
            job.Status = AutoFillJobStatus.Failed;
        }
        finally
        {
            job.CompletedAt = DateTime.UtcNow;
        }
    }

    public ServiceResult<IReadOnlyList<AutoFillJobDto>> List(Guid currentUserId)
    {
        if (currentUserId == Guid.Empty)
            return ServiceResult<IReadOnlyList<AutoFillJobDto>>.Unauthorized();

        var list = _jobs.Values
            .Where(j => j.UserId == currentUserId)
            .OrderByDescending(j => j.StartedAt)
            .Select(ToDto)
            .ToList();

        return ServiceResult<IReadOnlyList<AutoFillJobDto>>.Success(list);
    }

    public ServiceResult Dismiss(Guid jobId, Guid currentUserId)
    {
        if (currentUserId == Guid.Empty) return ServiceResult.Unauthorized();
        if (!_jobs.TryGetValue(jobId, out var job)) return ServiceResult.NotFound();
        if (job.UserId != currentUserId) return ServiceResult.Forbidden();
        // Only allow dismissing a finished job; in-flight jobs stay visible.
        if (job.Status == AutoFillJobStatus.Running || job.Status == AutoFillJobStatus.Pending)
            return ServiceResult.BadRequest("Job is still running.");
        _jobs.TryRemove(jobId, out _);
        return ServiceResult.Success();
    }

    public ServiceResult DismissAllCompleted(Guid currentUserId)
    {
        if (currentUserId == Guid.Empty) return ServiceResult.Unauthorized();
        foreach (var kv in _jobs)
        {
            if (kv.Value.UserId != currentUserId) continue;
            if (kv.Value.Status == AutoFillJobStatus.Completed || kv.Value.Status == AutoFillJobStatus.Failed)
                _jobs.TryRemove(kv.Key, out _);
        }
        return ServiceResult.Success();
    }

    private static AutoFillJobDto ToDto(JobState j) => new()
    {
        JobId = j.JobId,
        Scope = j.Scope,
        ScopeId = j.ScopeId,
        Status = j.Status,
        StartedAt = j.StartedAt,
        CompletedAt = j.CompletedAt,
        Pages = j.Pages.Select(p => new AutoFillPageProgressDto
        {
            PageId = p.PageId,
            PageNumber = p.PageNumber,
            DocumentId = p.DocumentId,
            DocumentTitle = p.DocumentTitle,
            Total = p.Total,
            Filled = p.Filled,
            Status = p.Status,
            Error = p.Error,
        }).ToList(),
    };

    private class JobState
    {
        public required Guid JobId { get; init; }
        public required Guid UserId { get; init; }
        public required AutoFillScope Scope { get; init; }
        public required Guid ScopeId { get; init; }
        public required DateTime StartedAt { get; init; }
        public DateTime? CompletedAt { get; set; }
        public AutoFillJobStatus Status { get; set; }
        public required List<PageState> Pages { get; init; }
    }

    private class PageState
    {
        public required Guid PageId { get; init; }
        public required int PageNumber { get; init; }
        public required Guid DocumentId { get; init; }
        public required string DocumentTitle { get; init; }
        public required int Total { get; init; }
        public int Filled { get; set; }
        public AutoFillPageStatus Status { get; set; }
        public string? Error { get; set; }
    }
}
