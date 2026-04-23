using AutoMapper;
using CipherAnnotation.Core.DTOs.Annotation;
using CipherAnnotation.Core.DTOs.Page;
using CipherAnnotation.Core.Entities;
using CipherAnnotation.Core.Enums;
using CipherAnnotation.Core.Interfaces;
using CipherAnnotation.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SixLabors.ImageSharp;
using System.Security.Claims;
using System.Text.Json;

namespace CipherAnnotation.API.Controllers;

[ApiController]
[Route("api/documents/{documentId:guid}/pages")]
[Authorize]
public class PagesController : ControllerBase
{
    /// <summary>Maximum per-page preprocess history records kept on the backend.</summary>
    private const int MaxHistoryPerPage = 7;

    private static readonly JsonSerializerOptions HistoryJsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    private readonly IDocumentRepository _documentRepository;
    private readonly IImageProcessingService _imageProcessingService;
    private readonly IFileStorageService _fileStorage;
    private readonly IMapper _mapper;
    private readonly ILogger<PagesController> _logger;
    private readonly AppDbContext _dbContext;

    public PagesController(
        IDocumentRepository documentRepository,
        IImageProcessingService imageProcessingService,
        IFileStorageService fileStorage,
        IMapper mapper,
        ILogger<PagesController> logger,
        AppDbContext dbContext)
    {
        _documentRepository = documentRepository ?? throw new ArgumentNullException(nameof(documentRepository));
        _imageProcessingService = imageProcessingService ?? throw new ArgumentNullException(nameof(imageProcessingService));
        _fileStorage = fileStorage ?? throw new ArgumentNullException(nameof(fileStorage));
        _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
    }

    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<PageDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<IEnumerable<PageDto>>> GetDocumentPagesAsync(
        Guid documentId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = GetCurrentUserId();
            var document = await _documentRepository.GetByIdAsync(documentId, cancellationToken);

            if (document == null)
                return NotFound(new { message = "Document not found." });

            if (!CanAccessDocument(document, userId))
                return Forbid();

            var orderedPages = document.Pages.OrderBy(p => p.PageNumber).ToList();
            var pageDtos = await MapPagesToDtosAsync(orderedPages, cancellationToken);

            return Ok(pageDtos);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while retrieving pages for document {DocumentId}.", documentId);
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { message = "An error occurred while retrieving pages." });
        }
    }

    [HttpGet("{pageId:guid}")]
    [ProducesResponseType(typeof(PageDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<PageDto>> GetPageByIdAsync(
        Guid documentId,
        Guid pageId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = GetCurrentUserId();
            var document = await _documentRepository.GetByIdAsync(documentId, cancellationToken);

            if (document == null)
                return NotFound(new { message = "Document not found." });

            if (!CanAccessDocument(document, userId))
                return Forbid();

            var page = document.Pages.FirstOrDefault(p => p.Id == pageId);
            if (page == null)
                return NotFound(new { message = "Page not found." });

            return Ok(await MapPageToDtoAsync(page, cancellationToken));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while retrieving page {PageId} from document {DocumentId}.", pageId, documentId);
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { message = "An error occurred while retrieving the page." });
        }
    }

    [HttpPost("{pageId:guid}/preprocess")]
    [ProducesResponseType(typeof(PageDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<PageDto>> PreprocessPageImageAsync(
        Guid documentId,
        Guid pageId,
        [FromBody] PreprocessRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userId = GetCurrentUserId();
            var document = await _documentRepository.GetByIdAsync(documentId, cancellationToken);

            if (document == null)
                return NotFound(new { message = "Document not found." });

            if (!CanAccessDocument(document, userId))
                return Forbid();

            var page = document.Pages.FirstOrDefault(p => p.Id == pageId);
            if (page == null)
                return NotFound(new { message = "Page not found." });

            var blobsToDelete = new List<Guid>();
            try
            {
                await ApplyPreprocessAndRecordAsync(page, request.Operations, blobsToDelete, cancellationToken);
            }
            catch (UnknownPreprocessOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (PreprocessSourceMissingException)
            {
                return BadRequest(new { message = "Page image data not found." });
            }

            _documentRepository.Update(document);
            await _documentRepository.SaveChangesAsync(cancellationToken);

            foreach (var blobId in blobsToDelete)
                await _fileStorage.DeleteAsync(blobId, cancellationToken);

            _logger.LogInformation("Page {PageId} preprocessed with operations: {Operations}", pageId, string.Join(", ", request.Operations.Select(o => o.Name)));
            return Ok(await MapPageToDtoAsync(page, cancellationToken));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while preprocessing page {PageId}.", pageId);
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { message = "An error occurred while preprocessing the page." });
        }
    }

    [HttpDelete("{pageId:guid}/preprocess")]
    [ProducesResponseType(typeof(PageDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<PageDto>> ResetPreprocessingAsync(
        Guid documentId,
        Guid pageId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = GetCurrentUserId();
            var document = await _documentRepository.GetByIdAsync(documentId, cancellationToken);

            if (document == null)
                return NotFound(new { message = "Document not found." });

            if (!CanAccessDocument(document, userId))
                return Forbid();

            var page = document.Pages.FirstOrDefault(p => p.Id == pageId);
            if (page == null)
                return NotFound(new { message = "Page not found." });

            var blobsToDelete = new List<Guid>();
            if (page.ProcessedImageBlobId.HasValue)
                blobsToDelete.Add(page.ProcessedImageBlobId.Value);

            // Drop the pointer first so the cascade on Pages.CurrentPreprocessHistoryId doesn't block us.
            page.ProcessedImageBlobId = null;
            page.CurrentPreprocessHistoryId = null;

            var historyEntries = await _dbContext.PreprocessHistoryEntries
                .Where(h => h.PageId == page.Id)
                .ToListAsync(cancellationToken);
            foreach (var entry in historyEntries)
            {
                if (entry.ResultBlobId.HasValue)
                    blobsToDelete.Add(entry.ResultBlobId.Value);
            }
            _dbContext.PreprocessHistoryEntries.RemoveRange(historyEntries);

            var originalBytes = await _fileStorage.GetBytesAsync(page.ImageBlobId, cancellationToken);
            if (originalBytes != null)
            {
                using var dimStream = new MemoryStream(originalBytes, writable: false);
                var info = await Image.IdentifyAsync(dimStream, cancellationToken);
                page.Width = info.Width;
                page.Height = info.Height;
            }

            _documentRepository.Update(document);
            await _documentRepository.SaveChangesAsync(cancellationToken);

            foreach (var blobId in blobsToDelete.Distinct())
                await _fileStorage.DeleteAsync(blobId, cancellationToken);

            return Ok(await MapPageToDtoAsync(page, cancellationToken));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error resetting preprocessing for page {PageId}.", pageId);
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { message = "An error occurred while resetting preprocessing." });
        }
    }

    [HttpGet("{pageId:guid}/image")]
    [ProducesResponseType(typeof(FileResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetPageImageAsync(
        Guid documentId,
        Guid pageId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = GetCurrentUserId();
            var document = await _documentRepository.GetByIdAsync(documentId, cancellationToken);

            if (document == null) return NotFound();
            if (!CanAccessDocument(document, userId)) return Forbid();

            var page = document.Pages.FirstOrDefault(p => p.Id == pageId);
            if (page == null) return NotFound();

            return await ServeBlobAsync(page.ImageBlobId, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while retrieving image for page {PageId}.", pageId);
            return StatusCode(StatusCodes.Status500InternalServerError);
        }
    }

    [HttpGet("{pageId:guid}/processed-image")]
    [ProducesResponseType(typeof(FileResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetProcessedImageAsync(
        Guid documentId,
        Guid pageId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = GetCurrentUserId();
            var document = await _documentRepository.GetByIdAsync(documentId, cancellationToken);

            if (document == null) return NotFound();
            if (!CanAccessDocument(document, userId)) return Forbid();

            var page = document.Pages.FirstOrDefault(p => p.Id == pageId);
            if (page?.ProcessedImageBlobId == null) return NotFound();

            return await ServeBlobAsync(page.ProcessedImageBlobId.Value, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while retrieving processed image for page {PageId}.", pageId);
            return StatusCode(StatusCodes.Status500InternalServerError);
        }
    }

    [HttpPost]
    [ProducesResponseType(typeof(IEnumerable<PageDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<IEnumerable<PageDto>>> AddPagesAsync(
        Guid documentId,
        [FromForm] List<IFormFile> files,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == Guid.Empty)
                return Unauthorized();

            var documentInfo = await _dbContext.Documents
                .AsNoTracking()
                .Where(d => d.Id == documentId)
                .Select(d => new { d.Id, d.OwnerId })
                .FirstOrDefaultAsync(cancellationToken);

            if (documentInfo == null)
                return NotFound(new { message = "Document not found." });

            if (documentInfo.OwnerId != userId)
                return Forbid();

            if (files == null || files.Count == 0)
                return BadRequest(new { message = "At least one image file is required." });

            var maxPageNumber = await _dbContext.Pages
                .Where(p => p.DocumentId == documentId)
                .Select(p => (int?)p.PageNumber)
                .MaxAsync(cancellationToken) ?? 0;

            var newPages = new List<PageDto>();
            int pageNumber = maxPageNumber + 1;

            foreach (var file in files)
            {
                if (file.Length == 0)
                    continue;

                var bytes = await ReadFileAsync(file, cancellationToken);
                var blobId = await _fileStorage.SaveAsync(bytes, file.FileName, file.ContentType ?? "application/octet-stream", cancellationToken);
                var (width, height) = GetImageDimensions(bytes);

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
                    CreatedAt = DateTime.UtcNow
                };

                await _dbContext.Pages.AddAsync(page, cancellationToken);
                // Fresh pages have no history: safe to build the DTO with CanUndo/CanRedo = false.
                newPages.Add(MapPageToDtoSync(page, currentSeq: null, minSeq: null, maxSeq: null));
                pageNumber++;
            }

            await _dbContext.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Added {PageCount} pages to document {DocumentId} by user {UserId}.",
                newPages.Count, documentId, userId);

            return StatusCode(StatusCodes.Status201Created, newPages);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while adding pages to document {DocumentId}.", documentId);
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { message = "An error occurred while adding pages." });
        }
    }

    [HttpGet("{pageId:guid}/preprocess/history")]
    [ProducesResponseType(typeof(PreprocessHistoryStateDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PreprocessHistoryStateDto>> GetPreprocessHistoryAsync(
        Guid documentId,
        Guid pageId,
        CancellationToken cancellationToken = default)
    {
        var userId = GetCurrentUserId();
        var document = await _documentRepository.GetByIdAsync(documentId, cancellationToken);
        if (document == null) return NotFound(new { message = "Document not found." });
        if (!CanAccessDocument(document, userId)) return Forbid();

        var page = document.Pages.FirstOrDefault(p => p.Id == pageId);
        if (page == null) return NotFound(new { message = "Page not found." });

        return Ok(await BuildHistoryStateAsync(page, cancellationToken));
    }

    [HttpPost("{pageId:guid}/preprocess/undo")]
    [ProducesResponseType(typeof(PreprocessHistoryStateDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PreprocessHistoryStateDto>> UndoPreprocessAsync(
        Guid documentId,
        Guid pageId,
        CancellationToken cancellationToken = default)
    {
        var userId = GetCurrentUserId();
        var document = await _documentRepository.GetByIdAsync(documentId, cancellationToken);
        if (document == null) return NotFound(new { message = "Document not found." });
        if (!CanAccessDocument(document, userId)) return Forbid();

        var page = document.Pages.FirstOrDefault(p => p.Id == pageId);
        if (page == null) return NotFound(new { message = "Page not found." });

        if (!page.CurrentPreprocessHistoryId.HasValue)
            return BadRequest(new { message = "Nothing to undo." });

        var currentEntry = await _dbContext.PreprocessHistoryEntries
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == page.CurrentPreprocessHistoryId.Value, cancellationToken);
        if (currentEntry == null)
        {
            // Dangling pointer — heal it by jumping to original.
            page.CurrentPreprocessHistoryId = null;
            page.ProcessedImageBlobId = null;
            await RefreshDimensionsFromOriginalAsync(page, cancellationToken);
            _documentRepository.Update(document);
            await _documentRepository.SaveChangesAsync(cancellationToken);
            return Ok(await BuildHistoryStateAsync(page, cancellationToken));
        }

        var previous = await _dbContext.PreprocessHistoryEntries
            .AsNoTracking()
            .Where(e => e.PageId == page.Id && e.Sequence == currentEntry.Sequence - 1)
            .FirstOrDefaultAsync(cancellationToken);

        if (previous == null)
        {
            // Past the oldest kept entry → jump to the original image.
            page.CurrentPreprocessHistoryId = null;
            page.ProcessedImageBlobId = null;
            await RefreshDimensionsFromOriginalAsync(page, cancellationToken);
        }
        else
        {
            page.CurrentPreprocessHistoryId = previous.Id;
            page.ProcessedImageBlobId = previous.ResultBlobId;
            page.Width = previous.ResultWidth;
            page.Height = previous.ResultHeight;
        }

        _documentRepository.Update(document);
        await _documentRepository.SaveChangesAsync(cancellationToken);
        return Ok(await BuildHistoryStateAsync(page, cancellationToken));
    }

    [HttpPost("{pageId:guid}/preprocess/redo")]
    [ProducesResponseType(typeof(PreprocessHistoryStateDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PreprocessHistoryStateDto>> RedoPreprocessAsync(
        Guid documentId,
        Guid pageId,
        CancellationToken cancellationToken = default)
    {
        var userId = GetCurrentUserId();
        var document = await _documentRepository.GetByIdAsync(documentId, cancellationToken);
        if (document == null) return NotFound(new { message = "Document not found." });
        if (!CanAccessDocument(document, userId)) return Forbid();

        var page = document.Pages.FirstOrDefault(p => p.Id == pageId);
        if (page == null) return NotFound(new { message = "Page not found." });

        PreprocessHistoryEntry? next;
        if (page.CurrentPreprocessHistoryId.HasValue)
        {
            var currentEntry = await _dbContext.PreprocessHistoryEntries
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.Id == page.CurrentPreprocessHistoryId.Value, cancellationToken);
            if (currentEntry == null)
                return BadRequest(new { message = "Current history entry not found." });

            next = await _dbContext.PreprocessHistoryEntries
                .AsNoTracking()
                .Where(e => e.PageId == page.Id && e.Sequence == currentEntry.Sequence + 1)
                .FirstOrDefaultAsync(cancellationToken);
        }
        else
        {
            // At original — redo to the earliest kept entry, if any.
            next = await _dbContext.PreprocessHistoryEntries
                .AsNoTracking()
                .Where(e => e.PageId == page.Id)
                .OrderBy(e => e.Sequence)
                .FirstOrDefaultAsync(cancellationToken);
        }

        if (next == null)
            return BadRequest(new { message = "Nothing to redo." });

        page.CurrentPreprocessHistoryId = next.Id;
        page.ProcessedImageBlobId = next.ResultBlobId;
        page.Width = next.ResultWidth;
        page.Height = next.ResultHeight;

        _documentRepository.Update(document);
        await _documentRepository.SaveChangesAsync(cancellationToken);
        return Ok(await BuildHistoryStateAsync(page, cancellationToken));
    }

    [HttpPost("preprocess/apply-all")]
    [ProducesResponseType(typeof(ApplyPreprocessToAllResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApplyPreprocessToAllResponse>> ApplyPreprocessToAllPagesAsync(
        Guid documentId,
        [FromBody] ApplyPreprocessToAllRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        if (request.Operations == null || request.Operations.Count == 0)
            return BadRequest(new { message = "At least one operation is required." });

        var userId = GetCurrentUserId();
        var document = await _documentRepository.GetByIdAsync(documentId, cancellationToken);
        if (document == null) return NotFound(new { message = "Document not found." });
        if (!CanAccessDocument(document, userId)) return Forbid();

        var orderedPages = document.Pages.OrderBy(p => p.PageNumber).ToList();
        var blobsToDelete = new List<Guid>();
        int applied = 0;
        int failed = 0;

        foreach (var page in orderedPages)
        {
            try
            {
                await ApplyPreprocessAndRecordAsync(page, request.Operations, blobsToDelete, cancellationToken);
                applied++;
            }
            catch (UnknownPreprocessOperationException ex)
            {
                // A bad operation name invalidates the whole request — bail without partial commit.
                return BadRequest(new { message = ex.Message });
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

        _documentRepository.Update(document);
        await _documentRepository.SaveChangesAsync(cancellationToken);

        foreach (var blobId in blobsToDelete.Distinct())
            await _fileStorage.DeleteAsync(blobId, cancellationToken);

        var pageDtos = await MapPagesToDtosAsync(orderedPages, cancellationToken);
        return Ok(new ApplyPreprocessToAllResponse
        {
            Pages = pageDtos,
            AppliedCount = applied,
            FailedCount = failed,
        });
    }

    // ------------------------------------------------------------------
    // Preprocess-history helpers
    // ------------------------------------------------------------------

    private sealed class UnknownPreprocessOperationException : Exception
    {
        public UnknownPreprocessOperationException(string name) : base($"Unknown operation: {name}") { }
    }

    private sealed class PreprocessSourceMissingException : Exception { }

    /// <summary>
    /// Applies the ops to <paramref name="page"/>, stores the resulting blob, creates a new
    /// history entry, truncates any redo branch, and prunes to <see cref="MaxHistoryPerPage"/>.
    /// Blob IDs safe to delete after SaveChanges are appended to <paramref name="blobsToDelete"/>.
    /// </summary>
    private async Task ApplyPreprocessAndRecordAsync(
        Page page,
        List<PreprocessOperation> operations,
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
                "binarize" => await _imageProcessingService.BinarizeAsync(currentBytes, ct),
                "threshold" => await _imageProcessingService.ThresholdAsync(currentBytes, op.Value ?? 0.5f, ct),
                "contrast" => await _imageProcessingService.AdjustContrastAsync(currentBytes, op.Value ?? 1.5f, ct),
                "deskew" => await _imageProcessingService.DeskewAsync(currentBytes, ct),
                "rotate" => await _imageProcessingService.RotateAsync(currentBytes, op.Value ?? 90f, ct),
                "denoise" or "remove_noise" => await _imageProcessingService.RemoveNoiseAsync(currentBytes, ct),
                "scale" => await _imageProcessingService.ScaleAsync(currentBytes, op.Value ?? 1.5f, ct),
                "grayscale" => await _imageProcessingService.GrayscaleAsync(currentBytes, ct),
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

        // Truncate redo branch.
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

        // Prune to MaxHistoryPerPage. After pruning the redo branch, remaining DB entries have
        // sequence <= currentSeq. Adding the new one brings the count to existingBelowOrAt + 1.
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

        var pageDto = MapPageToDtoSync(
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

    // Helper methods

    private async Task<IActionResult> ServeBlobAsync(Guid blobId, CancellationToken ct)
    {
        var blob = await _fileStorage.GetAsync(blobId, ct);
        if (blob == null) return NotFound();

        var etag = $"\"{blob.Sha256}\"";
        var ifNoneMatch = Request.Headers.IfNoneMatch.ToString();
        if (!string.IsNullOrEmpty(ifNoneMatch) && ifNoneMatch.Contains(etag, StringComparison.Ordinal))
            return StatusCode(StatusCodes.Status304NotModified);

        Response.Headers.ETag = etag;
        Response.Headers.CacheControl = "private, max-age=3600";
        return File(blob.Data, blob.ContentType);
    }

    private static async Task<byte[]> ReadFileAsync(IFormFile file, CancellationToken ct)
    {
        using var ms = new MemoryStream();
        await file.CopyToAsync(ms, ct);
        return ms.ToArray();
    }

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(userIdClaim, out var userId) ? userId : Guid.Empty;
    }

    private bool CanAccessDocument(Document document, Guid userId, bool allowAnonymousForPublic = false)
    {
        if (document.Visibility == Visibility.Public && allowAnonymousForPublic)
            return true;

        if (userId == Guid.Empty)
            return allowAnonymousForPublic && document.Visibility == Visibility.Public;

        return document.OwnerId == userId ||
               document.Visibility == Visibility.Public ||
               document.Shares.Any(s => s.UserId == userId);
    }

    private PageDto MapPageToDtoSync(Page page, int? currentSeq, int? minSeq, int? maxSeq)
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

    private async Task<PageDto> MapPageToDtoAsync(Page page, CancellationToken ct)
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

        return MapPageToDtoSync(page, currentSeq, minSeq, maxSeq);
    }

    private async Task<List<PageDto>> MapPagesToDtosAsync(IReadOnlyList<Page> pages, CancellationToken ct)
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
            return MapPageToDtoSync(p, currentSeq, minSeq, maxSeq);
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
