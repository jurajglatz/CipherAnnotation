using CipherAnnotation.API.Extensions;
using CipherAnnotation.Core.DTOs.Document;
using CipherAnnotation.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace CipherAnnotation.API.Controllers;

[ApiController]
[Route("api/documents")]
[Authorize]
public class DocumentsController : ControllerBase
{
    private readonly IDocumentService _documents;

    public DocumentsController(IDocumentService documents)
    {
        _documents = documents;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<DocumentDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetUserDocumentsAsync(CancellationToken ct = default)
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty) return Unauthorized();
        var result = await _documents.GetUserDocumentsAsync(userId, ct);
        return result.ToActionResult();
    }

    [HttpGet("public")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(IEnumerable<DocumentDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPublicDocumentsAsync(CancellationToken ct = default)
    {
        var userId = GetCurrentUserId();
        var result = await _documents.GetPublicDocumentsAsync(userId == Guid.Empty ? null : userId, ct);
        return result.ToActionResult();
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(DocumentDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetDocumentByIdAsync(Guid id, CancellationToken ct = default)
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty) return Unauthorized();
        var result = await _documents.GetByIdAsync(id, userId, ct);
        return result.ToActionResult();
    }

    [HttpPost]
    [ProducesResponseType(typeof(DocumentDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> CreateDocumentAsync(
        [FromForm] CreateDocumentRequest request,
        [FromForm] List<IFormFile> files,
        CancellationToken ct = default)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var userId = GetCurrentUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var uploads = await ReadUploadsAsync(files, ct);
        var result = await _documents.CreateAsync(userId, request, uploads, ct);
        return result.ToCreatedResult();
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(DocumentDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateDocumentAsync(
        Guid id,
        [FromBody] UpdateDocumentRequest request,
        CancellationToken ct = default)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var userId = GetCurrentUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var result = await _documents.UpdateAsync(id, userId, request, ct);
        return result.ToActionResult();
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteDocumentAsync(Guid id, CancellationToken ct = default)
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var result = await _documents.DeleteAsync(id, userId, ct);
        return result.ToActionResult();
    }

    [HttpPost("{id:guid}/share")]
    [ProducesResponseType(typeof(DocumentShareDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ShareDocumentAsync(
        Guid id,
        [FromBody] ShareDocumentRequest request,
        CancellationToken ct = default)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var userId = GetCurrentUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var result = await _documents.ShareAsync(id, userId, request, ct);
        return result.ToCreatedResult();
    }

    [HttpGet("{id:guid}/shares")]
    [ProducesResponseType(typeof(IEnumerable<DocumentShareDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetSharesAsync(Guid id, CancellationToken ct = default)
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var result = await _documents.GetSharesAsync(id, userId, ct);
        return result.ToActionResult();
    }

    [HttpDelete("{id:guid}/share/{shareId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RemoveShareAsync(Guid id, Guid shareId, CancellationToken ct = default)
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var result = await _documents.RemoveShareAsync(id, shareId, userId, ct);
        return result.ToActionResult();
    }

    [HttpPost("{id:guid}/duplicate")]
    [ProducesResponseType(typeof(DocumentDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DuplicateDocumentAsync(Guid id, CancellationToken ct = default)
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var result = await _documents.DuplicateAsync(id, userId, ct);
        return result.ToCreatedResult();
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
