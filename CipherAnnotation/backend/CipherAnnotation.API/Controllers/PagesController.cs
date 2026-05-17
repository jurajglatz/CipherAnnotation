using System.Security.Claims;
using CipherAnnotation.API.Extensions;
using CipherAnnotation.Core.Common;
using CipherAnnotation.Core.DTOs.Document;
using CipherAnnotation.Core.DTOs.Page;
using CipherAnnotation.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CipherAnnotation.API.Controllers;

[ApiController]
[Route("api/documents/{documentId:guid}/pages")]
[Authorize]
public class PagesController : ControllerBase
{
    private readonly IPageService _pages;

    public PagesController(IPageService pages)
    {
        _pages = pages;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<PageDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetDocumentPagesAsync(Guid documentId, CancellationToken ct = default)
    {
        var result = await _pages.GetDocumentPagesAsync(documentId, GetCurrentUserId(), ct);
        return result.ToActionResult();
    }

    [HttpGet("{pageId:guid}")]
    [ProducesResponseType(typeof(PageDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPageByIdAsync(Guid documentId, Guid pageId, CancellationToken ct = default)
    {
        var result = await _pages.GetPageByIdAsync(documentId, pageId, GetCurrentUserId(), ct);
        return result.ToActionResult();
    }

    [HttpPost("{pageId:guid}/preprocess")]
    [ProducesResponseType(typeof(PageDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> PreprocessPageImageAsync(
        Guid documentId, Guid pageId,
        [FromBody] PreprocessRequest request,
        CancellationToken ct = default)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        var result = await _pages.PreprocessPageAsync(documentId, pageId, GetCurrentUserId(), request.Operations, ct);
        return result.ToActionResult();
    }

    [HttpDelete("{pageId:guid}/preprocess")]
    [ProducesResponseType(typeof(PageDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> ResetPreprocessingAsync(Guid documentId, Guid pageId, CancellationToken ct = default)
    {
        var result = await _pages.ResetPreprocessingAsync(documentId, pageId, GetCurrentUserId(), ct);
        return result.ToActionResult();
    }

    [HttpGet("{pageId:guid}/image")]
    public async Task<IActionResult> GetPageImageAsync(Guid documentId, Guid pageId, CancellationToken ct = default)
    {
        var result = await _pages.GetPageImageAsync(documentId, pageId, GetCurrentUserId(), ct);
        return BlobResult(result);
    }

    [HttpGet("{pageId:guid}/processed-image")]
    public async Task<IActionResult> GetProcessedImageAsync(Guid documentId, Guid pageId, CancellationToken ct = default)
    {
        var result = await _pages.GetProcessedImageAsync(documentId, pageId, GetCurrentUserId(), ct);
        return BlobResult(result);
    }

    [HttpPost]
    [ProducesResponseType(typeof(IEnumerable<PageDto>), StatusCodes.Status201Created)]
    public async Task<IActionResult> AddPagesAsync(
        Guid documentId,
        [FromForm] List<IFormFile> files,
        CancellationToken ct = default)
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var uploads = await ReadUploadsAsync(files, ct);
        var result = await _pages.AddPagesAsync(documentId, userId, uploads, ct);
        return result.ToCreatedResult();
    }

    [HttpGet("{pageId:guid}/preprocess/history")]
    [ProducesResponseType(typeof(PreprocessHistoryStateDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPreprocessHistoryAsync(Guid documentId, Guid pageId, CancellationToken ct = default)
    {
        var result = await _pages.GetPreprocessHistoryAsync(documentId, pageId, GetCurrentUserId(), ct);
        return result.ToActionResult();
    }

    [HttpPost("{pageId:guid}/preprocess/undo")]
    [ProducesResponseType(typeof(PreprocessHistoryStateDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> UndoPreprocessAsync(Guid documentId, Guid pageId, CancellationToken ct = default)
    {
        var result = await _pages.UndoPreprocessAsync(documentId, pageId, GetCurrentUserId(), ct);
        return result.ToActionResult();
    }

    [HttpPost("{pageId:guid}/preprocess/redo")]
    [ProducesResponseType(typeof(PreprocessHistoryStateDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> RedoPreprocessAsync(Guid documentId, Guid pageId, CancellationToken ct = default)
    {
        var result = await _pages.RedoPreprocessAsync(documentId, pageId, GetCurrentUserId(), ct);
        return result.ToActionResult();
    }

    [HttpPost("preprocess/apply-all")]
    [ProducesResponseType(typeof(ApplyPreprocessToAllResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> ApplyPreprocessToAllPagesAsync(
        Guid documentId,
        [FromBody] ApplyPreprocessToAllRequest request,
        CancellationToken ct = default)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        var result = await _pages.ApplyPreprocessToAllAsync(documentId, GetCurrentUserId(), request.Operations, ct);
        return result.ToActionResult();
    }

    private IActionResult BlobResult(ServiceResult<BlobContent> result)
    {
        if (!result.IsSuccess) return result.ToActionResult();

        var blob = result.Value!;
        var etag = $"\"{blob.Sha256}\"";
        var ifNoneMatch = Request.Headers.IfNoneMatch.ToString();
        if (!string.IsNullOrEmpty(ifNoneMatch) && ifNoneMatch.Contains(etag, StringComparison.Ordinal))
            return StatusCode(StatusCodes.Status304NotModified);

        Response.Headers.ETag = etag;
        Response.Headers.CacheControl = "private, max-age=3600";
        return File(blob.Data, blob.ContentType);
    }

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(userIdClaim, out var userId) ? userId : Guid.Empty;
    }

    private static async Task<IReadOnlyList<UploadedFile>> ReadUploadsAsync(
        List<IFormFile> files, CancellationToken ct)
    {
        if (files == null || files.Count == 0)
            return Array.Empty<UploadedFile>();

        var uploads = new List<UploadedFile>(files.Count);
        foreach (var file in files)
        {
            if (file.Length == 0) continue;
            using var ms = new MemoryStream();
            await file.CopyToAsync(ms, ct);
            uploads.Add(new UploadedFile(
                ms.ToArray(),
                file.FileName,
                file.ContentType ?? "application/octet-stream"));
        }
        return uploads;
    }
}
