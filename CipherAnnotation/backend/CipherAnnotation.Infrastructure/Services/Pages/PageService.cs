using System.Text.Json;
using CipherAnnotation.Core.Common;
using CipherAnnotation.Core.DTOs.Document;
using CipherAnnotation.Core.DTOs.Page;
using CipherAnnotation.Core.Entities;
using CipherAnnotation.Core.Enums;
using CipherAnnotation.Core.Interfaces;
using CipherAnnotation.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SixLabors.ImageSharp;

namespace CipherAnnotation.Infrastructure.Services.Pages;

public class PageService : IPageService
{
    private const int MaxHistoryPerPage = 7;

    private static readonly JsonSerializerOptions HistoryJsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    private readonly IImageProcessingService _imageProcessing;
    private readonly IFileStorageService _fileStorage;
    private readonly AppDbContext _dbContext;
    private readonly ILogger<PageService> _logger;

    public PageService(
        IImageProcessingService imageProcessing,
        IFileStorageService fileStorage,
        AppDbContext dbContext,
        ILogger<PageService> logger)
    {
        _imageProcessing = imageProcessing;
        _fileStorage = fileStorage;
        _dbContext = dbContext;
        _logger = logger;
    }

    private Task<Document?> LoadDocumentAsync(Guid documentId, CancellationToken ct) =>
        _dbContext.Documents.IncludeDetails()
            .FirstOrDefaultAsync(d => d.Id == documentId, ct);

    public async Task<ServiceResult<IEnumerable<PageDto>>> GetDocumentPagesAsync(
        Guid documentId, Guid currentUserId, CancellationToken ct = default)
    {
        var document = await LoadDocumentAsync(documentId, ct);
        if (document == null)
            return ServiceResult<IEnumerable<PageDto>>.NotFound("Document not found.");
        if (!CanAccess(document, currentUserId))
            return ServiceResult<IEnumerable<PageDto>>.Forbidden();

        var ordered = document.Pages.OrderBy(p => p.PageNumber).ToList();
        var dtos = await MapPagesAsync(ordered, ct);
        return ServiceResult<IEnumerable<PageDto>>.Success(dtos);
    }

    public async Task<ServiceResult<PageDto>> GetPageByIdAsync(
        Guid documentId, Guid pageId, Guid currentUserId, CancellationToken ct = default)
    {
        var document = await LoadDocumentAsync(documentId, ct);
        if (document == null) return ServiceResult<PageDto>.NotFound("Document not found.");
        if (!CanAccess(document, currentUserId)) return ServiceResult<PageDto>.Forbidden();

        var page = document.Pages.FirstOrDefault(p => p.Id == pageId);
        if (page == null) return ServiceResult<PageDto>.NotFound("Page not found.");

        return ServiceResult<PageDto>.Success(await MapPageAsync(page, ct));
    }

    public async Task<ServiceResult<PageDto>> PreprocessPageAsync(
        Guid documentId, Guid pageId, Guid currentUserId,
        IReadOnlyList<PreprocessOperation> operations, CancellationToken ct = default)
    {
        var document = await LoadDocumentAsync(documentId, ct);
        if (document == null) return ServiceResult<PageDto>.NotFound("Document not found.");
        if (!CanEdit(document, currentUserId)) return ServiceResult<PageDto>.Forbidden();

        var page = document.Pages.FirstOrDefault(p => p.Id == pageId);
        if (page == null) return ServiceResult<PageDto>.NotFound("Page not found.");

        var blobsToDelete = new List<Guid>();
        try
        {
            await ApplyPreprocessAndRecordAsync(page, operations, blobsToDelete, ct);
        }
        catch (UnknownPreprocessOperationException ex)
        {
            return ServiceResult<PageDto>.BadRequest(ex.Message);
        }
        catch (PreprocessSourceMissingException)
        {
            return ServiceResult<PageDto>.BadRequest("Page image data not found.");
        }

        
        await _dbContext.SaveChangesAsync(ct);

        foreach (var blobId in blobsToDelete.Distinct())
            await _fileStorage.DeleteAsync(blobId, ct);

        _logger.LogInformation("Page {PageId} preprocessed with operations: {Operations}",
            pageId, string.Join(", ", operations.Select(o => o.Name)));

        return ServiceResult<PageDto>.Success(await MapPageAsync(page, ct));
    }

    public async Task<ServiceResult<PageDto>> ResetPreprocessingAsync(
        Guid documentId, Guid pageId, Guid currentUserId, CancellationToken ct = default)
    {
        var document = await LoadDocumentAsync(documentId, ct);
        if (document == null) return ServiceResult<PageDto>.NotFound("Document not found.");
        if (!CanEdit(document, currentUserId)) return ServiceResult<PageDto>.Forbidden();

        var page = document.Pages.FirstOrDefault(p => p.Id == pageId);
        if (page == null) return ServiceResult<PageDto>.NotFound("Page not found.");

        var blobsToDelete = new List<Guid>();
        if (page.ProcessedImageBlobId.HasValue)
            blobsToDelete.Add(page.ProcessedImageBlobId.Value);

        page.ProcessedImageBlobId = null;
        page.CurrentPreprocessHistoryId = null;

        var historyEntries = await _dbContext.PreprocessHistoryEntries
            .Where(h => h.PageId == page.Id)
            .ToListAsync(ct);
        foreach (var entry in historyEntries)
        {
            if (entry.ResultBlobId.HasValue) blobsToDelete.Add(entry.ResultBlobId.Value);
        }
        _dbContext.PreprocessHistoryEntries.RemoveRange(historyEntries);

        await RefreshDimensionsFromOriginalAsync(page, ct);

        
        await _dbContext.SaveChangesAsync(ct);

        foreach (var blobId in blobsToDelete.Distinct())
            await _fileStorage.DeleteAsync(blobId, ct);

        return ServiceResult<PageDto>.Success(await MapPageAsync(page, ct));
    }

    public async Task<ServiceResult<BlobContent>> GetPageImageAsync(
        Guid documentId, Guid pageId, Guid currentUserId, CancellationToken ct = default)
    {
        var document = await LoadDocumentAsync(documentId, ct);
        if (document == null) return ServiceResult<BlobContent>.NotFound("Document not found.");
        if (!CanAccess(document, currentUserId)) return ServiceResult<BlobContent>.Forbidden();

        var page = document.Pages.FirstOrDefault(p => p.Id == pageId);
        if (page == null) return ServiceResult<BlobContent>.NotFound("Page not found.");

        return await LoadBlobAsync(page.ImageBlobId, ct);
    }

    public async Task<ServiceResult<BlobContent>> GetProcessedImageAsync(
        Guid documentId, Guid pageId, Guid currentUserId, CancellationToken ct = default)
    {
        var document = await LoadDocumentAsync(documentId, ct);
        if (document == null) return ServiceResult<BlobContent>.NotFound("Document not found.");
        if (!CanAccess(document, currentUserId)) return ServiceResult<BlobContent>.Forbidden();

        var page = document.Pages.FirstOrDefault(p => p.Id == pageId);
        if (page?.ProcessedImageBlobId == null)
            return ServiceResult<BlobContent>.NotFound("Processed image not found.");

        return await LoadBlobAsync(page.ProcessedImageBlobId.Value, ct);
    }

    public async Task<ServiceResult<IEnumerable<PageDto>>> AddPagesAsync(
        Guid documentId, Guid currentUserId,
        IReadOnlyList<UploadedFile> files, CancellationToken ct = default)
    {
        var documentInfo = await _dbContext.Documents
            .AsNoTracking()
            .Where(d => d.Id == documentId)
            .Select(d => new { d.Id, d.OwnerId })
            .FirstOrDefaultAsync(ct);

        if (documentInfo == null)
            return ServiceResult<IEnumerable<PageDto>>.NotFound("Document not found.");
        if (documentInfo.OwnerId != currentUserId)
            return ServiceResult<IEnumerable<PageDto>>.Forbidden();
        if (files == null || files.Count == 0)
            return ServiceResult<IEnumerable<PageDto>>.BadRequest("At least one image file is required.");

        var maxPageNumber = await _dbContext.Pages
            .Where(p => p.DocumentId == documentId)
            .Select(p => (int?)p.PageNumber)
            .MaxAsync(ct) ?? 0;

        var newPages = new List<PageDto>();
        int pageNumber = maxPageNumber + 1;

        foreach (var file in files)
        {
            if (file.Content.Length == 0) continue;

            var blobId = await _fileStorage.SaveAsync(
                file.Content, file.FileName, file.ContentType, ct);
            var (width, height) = GetImageDimensions(file.Content);

            var page = new Page
            {
                Id = Guid.NewGuid(),
                DocumentId = documentId,
                PageNumber = pageNumber,
                ImageBlobId = blobId,
                Width = width,
                Height = height,
                Orientation = 0,
                ResolutionDPI = 300,
                CreatedAt = DateTime.UtcNow,
            };

            await _dbContext.Pages.AddAsync(page, ct);
            newPages.Add(MapPageSync(page, currentSeq: null, minSeq: null, maxSeq: null));
            pageNumber++;
        }

        await _dbContext.SaveChangesAsync(ct);

        _logger.LogInformation("Added {PageCount} pages to document {DocumentId} by user {UserId}.",
            newPages.Count, documentId, currentUserId);

        return ServiceResult<IEnumerable<PageDto>>.Success(newPages);
    }

    public async Task<ServiceResult<PreprocessHistoryStateDto>> GetPreprocessHistoryAsync(
        Guid documentId, Guid pageId, Guid currentUserId, CancellationToken ct = default)
    {
        var document = await LoadDocumentAsync(documentId, ct);
        if (document == null) return ServiceResult<PreprocessHistoryStateDto>.NotFound("Document not found.");
        if (!CanAccess(document, currentUserId)) return ServiceResult<PreprocessHistoryStateDto>.Forbidden();

        var page = document.Pages.FirstOrDefault(p => p.Id == pageId);
        if (page == null) return ServiceResult<PreprocessHistoryStateDto>.NotFound("Page not found.");

        return ServiceResult<PreprocessHistoryStateDto>.Success(await BuildHistoryStateAsync(page, ct));
    }

    public async Task<ServiceResult<PreprocessHistoryStateDto>> UndoPreprocessAsync(
        Guid documentId, Guid pageId, Guid currentUserId, CancellationToken ct = default)
    {
        var document = await LoadDocumentAsync(documentId, ct);
        if (document == null) return ServiceResult<PreprocessHistoryStateDto>.NotFound("Document not found.");
        if (!CanEdit(document, currentUserId)) return ServiceResult<PreprocessHistoryStateDto>.Forbidden();

        var page = document.Pages.FirstOrDefault(p => p.Id == pageId);
        if (page == null) return ServiceResult<PreprocessHistoryStateDto>.NotFound("Page not found.");

        if (!page.CurrentPreprocessHistoryId.HasValue)
            return ServiceResult<PreprocessHistoryStateDto>.BadRequest("Nothing to undo.");

        var currentEntry = await _dbContext.PreprocessHistoryEntries
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == page.CurrentPreprocessHistoryId.Value, ct);
        if (currentEntry == null)
        {
            page.CurrentPreprocessHistoryId = null;
            page.ProcessedImageBlobId = null;
            await RefreshDimensionsFromOriginalAsync(page, ct);
            
            await _dbContext.SaveChangesAsync(ct);
            return ServiceResult<PreprocessHistoryStateDto>.Success(await BuildHistoryStateAsync(page, ct));
        }

        var previous = await _dbContext.PreprocessHistoryEntries
            .AsNoTracking()
            .Where(e => e.PageId == page.Id && e.Sequence == currentEntry.Sequence - 1)
            .FirstOrDefaultAsync(ct);

        if (previous == null)
        {
            page.CurrentPreprocessHistoryId = null;
            page.ProcessedImageBlobId = null;
            await RefreshDimensionsFromOriginalAsync(page, ct);
        }
        else
        {
            page.CurrentPreprocessHistoryId = previous.Id;
            page.ProcessedImageBlobId = previous.ResultBlobId;
            page.Width = previous.ResultWidth;
            page.Height = previous.ResultHeight;
        }

        
        await _dbContext.SaveChangesAsync(ct);
        return ServiceResult<PreprocessHistoryStateDto>.Success(await BuildHistoryStateAsync(page, ct));
    }

    public async Task<ServiceResult<PreprocessHistoryStateDto>> RedoPreprocessAsync(
        Guid documentId, Guid pageId, Guid currentUserId, CancellationToken ct = default)
    {
        var document = await LoadDocumentAsync(documentId, ct);
        if (document == null) return ServiceResult<PreprocessHistoryStateDto>.NotFound("Document not found.");
        if (!CanEdit(document, currentUserId)) return ServiceResult<PreprocessHistoryStateDto>.Forbidden();

        var page = document.Pages.FirstOrDefault(p => p.Id == pageId);
        if (page == null) return ServiceResult<PreprocessHistoryStateDto>.NotFound("Page not found.");

        PreprocessHistoryEntry? next;
        if (page.CurrentPreprocessHistoryId.HasValue)
        {
            var currentEntry = await _dbContext.PreprocessHistoryEntries
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.Id == page.CurrentPreprocessHistoryId.Value, ct);
            if (currentEntry == null)
                return ServiceResult<PreprocessHistoryStateDto>.BadRequest("Current history entry not found.");

            next = await _dbContext.PreprocessHistoryEntries
                .AsNoTracking()
                .Where(e => e.PageId == page.Id && e.Sequence == currentEntry.Sequence + 1)
                .FirstOrDefaultAsync(ct);
        }
        else
        {
            next = await _dbContext.PreprocessHistoryEntries
                .AsNoTracking()
                .Where(e => e.PageId == page.Id)
                .OrderBy(e => e.Sequence)
                .FirstOrDefaultAsync(ct);
        }

        if (next == null)
            return ServiceResult<PreprocessHistoryStateDto>.BadRequest("Nothing to redo.");

        page.CurrentPreprocessHistoryId = next.Id;
        page.ProcessedImageBlobId = next.ResultBlobId;
        page.Width = next.ResultWidth;
        page.Height = next.ResultHeight;

        
        await _dbContext.SaveChangesAsync(ct);
        return ServiceResult<PreprocessHistoryStateDto>.Success(await BuildHistoryStateAsync(page, ct));
    }

    public async Task<ServiceResult<ApplyPreprocessToAllResponse>> ApplyPreprocessToAllAsync(
        Guid documentId, Guid currentUserId,
        IReadOnlyList<PreprocessOperation> operations, CancellationToken ct = default)
    {
        if (operations == null || operations.Count == 0)
            return ServiceResult<ApplyPreprocessToAllResponse>.BadRequest("At least one operation is required.");

        var document = await LoadDocumentAsync(documentId, ct);
        if (document == null) return ServiceResult<ApplyPreprocessToAllResponse>.NotFound("Document not found.");
        if (!CanEdit(document, currentUserId)) return ServiceResult<ApplyPreprocessToAllResponse>.Forbidden();

        var orderedPages = document.Pages.OrderBy(p => p.PageNumber).ToList();
        var blobsToDelete = new List<Guid>();
        int applied = 0, failed = 0;

        foreach (var page in orderedPages)
        {
            try
            {
                await ApplyPreprocessAndRecordAsync(page, operations, blobsToDelete, ct);
                applied++;
            }
            catch (UnknownPreprocessOperationException ex)
            {
                return ServiceResult<ApplyPreprocessToAllResponse>.BadRequest(ex.Message);
            }
            catch (PreprocessSourceMissingException)
            {
                failed++;
                _logger.LogWarning("Skipped page {PageId} during apply-all — source image missing.", page.Id);
            }
            catch (Exception ex)
            {
                failed++;
                _logger.LogError(ex, "Error applying preprocess to page {PageId} during apply-all.", page.Id);
            }
        }

        
        await _dbContext.SaveChangesAsync(ct);

        foreach (var blobId in blobsToDelete.Distinct())
            await _fileStorage.DeleteAsync(blobId, ct);

        var dtos = await MapPagesAsync(orderedPages, ct);
        return ServiceResult<ApplyPreprocessToAllResponse>.Success(new ApplyPreprocessToAllResponse
        {
            Pages = dtos,
            AppliedCount = applied,
            FailedCount = failed,
        });
    }

    // ---- internal helpers ----

    private sealed class UnknownPreprocessOperationException : Exception
    {
        public UnknownPreprocessOperationException(string name) : base($"Unknown operation: {name}") { }
    }

    private sealed class PreprocessSourceMissingException : Exception { }

    private async Task ApplyPreprocessAndRecordAsync(
        Page page,
        IReadOnlyList<PreprocessOperation> operations,
        List<Guid> blobsToDelete,
        CancellationToken ct)
    {
        var sourceBlobId = page.ProcessedImageBlobId ?? page.ImageBlobId;
        var currentBytes = await _fileStorage.GetBytesAsync(sourceBlobId, ct)
            ?? throw new PreprocessSourceMissingException();

        foreach (var op in operations)
        {
            currentBytes = op.Name.ToLowerInvariant() switch
            {
                "binarize" => await _imageProcessing.BinarizeAsync(currentBytes, ct),
                "threshold" => await _imageProcessing.ThresholdAsync(currentBytes, op.Value ?? 0.5f, ct),
                "contrast" => await _imageProcessing.AdjustContrastAsync(currentBytes, op.Value ?? 1.5f, ct),
                "deskew" => await _imageProcessing.DeskewAsync(currentBytes, ct),
                "rotate" => await _imageProcessing.RotateAsync(currentBytes, op.Value ?? 90f, ct),
                "denoise" or "remove_noise" => await _imageProcessing.RemoveNoiseAsync(currentBytes, ct),
                "scale" => await _imageProcessing.ScaleAsync(currentBytes, op.Value ?? 1.5f, ct),
                "grayscale" => await _imageProcessing.GrayscaleAsync(currentBytes, ct),
                _ => throw new UnknownPreprocessOperationException(op.Name),
            };
        }

        var newBlobId = await _fileStorage.SaveAsync(
            currentBytes,
            $"page_{page.PageNumber}_processed.png",
            "image/png",
            ct);

        int newWidth, newHeight;
        using (var dim = new MemoryStream(currentBytes, writable: false))
        {
            var info = await Image.IdentifyAsync(dim, ct);
            newWidth = info.Width;
            newHeight = info.Height;
        }

        int currentSeq = 0;
        if (page.CurrentPreprocessHistoryId.HasValue)
        {
            currentSeq = await _dbContext.PreprocessHistoryEntries
                .AsNoTracking()
                .Where(e => e.Id == page.CurrentPreprocessHistoryId.Value)
                .Select(e => e.Sequence)
                .FirstOrDefaultAsync(ct);
        }

        var redoBranch = await _dbContext.PreprocessHistoryEntries
            .Where(e => e.PageId == page.Id && e.Sequence > currentSeq)
            .ToListAsync(ct);
        foreach (var e in redoBranch)
        {
            if (e.ResultBlobId.HasValue) blobsToDelete.Add(e.ResultBlobId.Value);
        }
        _dbContext.PreprocessHistoryEntries.RemoveRange(redoBranch);

        var previousBlobId = page.ProcessedImageBlobId;
        var newEntry = new PreprocessHistoryEntry
        {
            Id = Guid.NewGuid(),
            PageId = page.Id,
            Sequence = currentSeq + 1,
            OperationsJson = JsonSerializer.Serialize(operations, HistoryJsonOptions),
            ResultBlobId = newBlobId,
            PreviousBlobId = previousBlobId,
            ResultWidth = newWidth,
            ResultHeight = newHeight,
            AppliedAt = DateTime.UtcNow,
        };
        await _dbContext.PreprocessHistoryEntries.AddAsync(newEntry, ct);

        page.ProcessedImageBlobId = newBlobId;
        page.CurrentPreprocessHistoryId = newEntry.Id;
        page.Width = newWidth;
        page.Height = newHeight;

        var existingBelowOrAt = await _dbContext.PreprocessHistoryEntries
            .Where(e => e.PageId == page.Id && e.Sequence <= currentSeq)
            .CountAsync(ct);
        int pruneCount = (existingBelowOrAt + 1) - MaxHistoryPerPage;
        if (pruneCount > 0)
        {
            var oldest = await _dbContext.PreprocessHistoryEntries
                .Where(e => e.PageId == page.Id && e.Sequence <= currentSeq)
                .OrderBy(e => e.Sequence)
                .Take(pruneCount)
                .ToListAsync(ct);
            foreach (var entry in oldest)
            {
                if (entry.ResultBlobId.HasValue) blobsToDelete.Add(entry.ResultBlobId.Value);
            }
            _dbContext.PreprocessHistoryEntries.RemoveRange(oldest);
        }
    }

    private async Task RefreshDimensionsFromOriginalAsync(Page page, CancellationToken ct)
    {
        var bytes = await _fileStorage.GetBytesAsync(page.ImageBlobId, ct);
        if (bytes == null) return;
        using var ms = new MemoryStream(bytes, writable: false);
        var info = await Image.IdentifyAsync(ms, ct);
        page.Width = info.Width;
        page.Height = info.Height;
    }

    private async Task<PreprocessHistoryStateDto> BuildHistoryStateAsync(Page page, CancellationToken ct)
    {
        var entries = await _dbContext.PreprocessHistoryEntries
            .AsNoTracking()
            .Where(e => e.PageId == page.Id)
            .OrderBy(e => e.Sequence)
            .ToListAsync(ct);

        var entryDtos = entries.Select(e => new PreprocessHistoryEntryDto
        {
            Id = e.Id,
            Sequence = e.Sequence,
            Operations = DeserializeOps(e.OperationsJson),
            AppliedAt = e.AppliedAt,
            IsCurrent = page.CurrentPreprocessHistoryId == e.Id,
        }).ToList();

        int? currentSeq = page.CurrentPreprocessHistoryId.HasValue
            ? entries.FirstOrDefault(e => e.Id == page.CurrentPreprocessHistoryId.Value)?.Sequence
            : null;

        bool canUndo = page.CurrentPreprocessHistoryId.HasValue;
        bool canRedo = currentSeq.HasValue
            ? entries.Any(e => e.Sequence > currentSeq.Value)
            : entries.Count > 0;

        var pageDto = MapPageSync(
            page,
            currentSeq: currentSeq,
            minSeq: entries.Count > 0 ? entries[0].Sequence : null,
            maxSeq: entries.Count > 0 ? entries[^1].Sequence : null);

        return new PreprocessHistoryStateDto
        {
            Page = pageDto,
            Entries = entryDtos,
            CanUndo = canUndo,
            CanRedo = canRedo,
        };
    }

    private static List<PreprocessOperation> DeserializeOps(string json)
    {
        try
        {
            return JsonSerializer.Deserialize<List<PreprocessOperation>>(json, HistoryJsonOptions) ?? new();
        }
        catch
        {
            return new List<PreprocessOperation>();
        }
    }

    private async Task<ServiceResult<BlobContent>> LoadBlobAsync(Guid blobId, CancellationToken ct)
    {
        var blob = await _fileStorage.GetAsync(blobId, ct);
        if (blob == null) return ServiceResult<BlobContent>.NotFound("Blob not found.");
        return ServiceResult<BlobContent>.Success(new BlobContent(blob.Data, blob.ContentType, blob.Sha256));
    }

    private static bool CanAccess(Document document, Guid userId)
    {
        if (userId == Guid.Empty) return document.Visibility == Visibility.Public;
        return document.OwnerId == userId
            || document.Visibility == Visibility.Public
            || document.Shares.Any(s => s.UserId == userId);
    }

    private static bool CanEdit(Document document, Guid userId)
    {
        if (userId == Guid.Empty) return false;
        return document.OwnerId == userId
            || document.Shares.Any(s => s.UserId == userId && s.Permission == PermissionType.Edit);
    }

    private static PageDto MapPageSync(Page page, int? currentSeq, int? minSeq, int? maxSeq)
    {
        var imageUrl = $"/documents/{page.DocumentId}/pages/{page.Id}/image";
        var processedImageUrl = page.ProcessedImageBlobId.HasValue
            ? $"/documents/{page.DocumentId}/pages/{page.Id}/processed-image?v={page.ProcessedImageBlobId}"
            : null;

        bool canUndo = page.CurrentPreprocessHistoryId.HasValue;
        bool canRedo = currentSeq.HasValue
            ? (maxSeq.HasValue && maxSeq.Value > currentSeq.Value)
            : minSeq.HasValue;

        return new PageDto
        {
            Id = page.Id,
            DocumentId = page.DocumentId,
            PageNumber = page.PageNumber,
            ImageUrl = imageUrl,
            ProcessedImageUrl = processedImageUrl,
            Width = page.Width,
            Height = page.Height,
            Orientation = page.Orientation,
            ResolutionDPI = page.ResolutionDPI,
            CreatedAt = page.CreatedAt,
            CurrentPreprocessHistoryId = page.CurrentPreprocessHistoryId,
            CanUndoPreprocess = canUndo,
            CanRedoPreprocess = canRedo,
        };
    }

    private async Task<PageDto> MapPageAsync(Page page, CancellationToken ct)
    {
        int? currentSeq = null, minSeq = null, maxSeq = null;
        if (page.CurrentPreprocessHistoryId.HasValue)
        {
            currentSeq = await _dbContext.PreprocessHistoryEntries
                .AsNoTracking()
                .Where(e => e.Id == page.CurrentPreprocessHistoryId.Value)
                .Select(e => (int?)e.Sequence)
                .FirstOrDefaultAsync(ct);
        }

        var bounds = await _dbContext.PreprocessHistoryEntries
            .AsNoTracking()
            .Where(e => e.PageId == page.Id)
            .GroupBy(e => e.PageId)
            .Select(g => new { Min = g.Min(e => e.Sequence), Max = g.Max(e => e.Sequence) })
            .FirstOrDefaultAsync(ct);
        if (bounds != null)
        {
            minSeq = bounds.Min;
            maxSeq = bounds.Max;
        }

        return MapPageSync(page, currentSeq, minSeq, maxSeq);
    }

    private async Task<List<PageDto>> MapPagesAsync(IReadOnlyList<Page> pages, CancellationToken ct)
    {
        if (pages.Count == 0) return new List<PageDto>();

        var pageIds = pages.Select(p => p.Id).ToList();

        var bounds = await _dbContext.PreprocessHistoryEntries
            .AsNoTracking()
            .Where(e => pageIds.Contains(e.PageId))
            .GroupBy(e => e.PageId)
            .Select(g => new { PageId = g.Key, Min = g.Min(e => e.Sequence), Max = g.Max(e => e.Sequence) })
            .ToDictionaryAsync(x => x.PageId, ct);

        var currentIds = pages
            .Where(p => p.CurrentPreprocessHistoryId.HasValue)
            .Select(p => p.CurrentPreprocessHistoryId!.Value)
            .Distinct()
            .ToList();

        Dictionary<Guid, int> currentSeqs = currentIds.Count == 0
            ? new()
            : await _dbContext.PreprocessHistoryEntries
                .AsNoTracking()
                .Where(e => currentIds.Contains(e.Id))
                .Select(e => new { e.Id, e.Sequence })
                .ToDictionaryAsync(x => x.Id, x => x.Sequence, ct);

        return pages.Select(p =>
        {
            int? currentSeq = p.CurrentPreprocessHistoryId.HasValue
                && currentSeqs.TryGetValue(p.CurrentPreprocessHistoryId.Value, out var s)
                ? s
                : (int?)null;
            int? minSeq = bounds.TryGetValue(p.Id, out var b) ? b.Min : null;
            int? maxSeq = bounds.TryGetValue(p.Id, out var b2) ? b2.Max : null;
            return MapPageSync(p, currentSeq, minSeq, maxSeq);
        }).ToList();
    }

    private static (int width, int height) GetImageDimensions(byte[] bytes)
    {
        try
        {
            using var image = Image.Load(bytes);
            return (image.Width, image.Height);
        }
        catch
        {
            return (1024, 1024);
        }
    }
}
