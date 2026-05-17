using System.Security.Claims;
using CipherAnnotation.API.Extensions;
using CipherAnnotation.API.Validation;
using CipherAnnotation.Core.Common;
using CipherAnnotation.Core.DTOs.Document;
using CipherAnnotation.Core.DTOs.Export;
using CipherAnnotation.Core.Enums;
using CipherAnnotation.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CipherAnnotation.API.Controllers;

[ApiController]
[Route("api/export")]
[Authorize]
public class ExportController : ControllerBase
{
    private readonly IExportOrchestrationService _export;
    private readonly UploadValidator _uploadValidator;

    public ExportController(IExportOrchestrationService export, UploadValidator uploadValidator)
    {
        _export = export;
        _uploadValidator = uploadValidator;
    }

    [HttpPost("coco")]
    public async Task<IActionResult> ExportCocoAsync([FromBody] ExportRequest request, CancellationToken ct = default)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        var result = await _export.ExportCocoAsync(GetCurrentUserId(), request, ct);
        return ArtifactResult(result);
    }

    [HttpPost("yolo")]
    public async Task<IActionResult> ExportYoloAsync([FromBody] ExportRequest request, CancellationToken ct = default)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        var result = await _export.ExportYoloAsync(GetCurrentUserId(), request, ct);
        return ArtifactResult(result);
    }

    [HttpPost("tfrecord")]
    public async Task<IActionResult> ExportTfRecordAsync([FromBody] ExportRequest request, CancellationToken ct = default)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        var result = await _export.ExportTfRecordAsync(GetCurrentUserId(), request, ct);
        return ArtifactResult(result);
    }

    [HttpPost("import/coco")]
    public async Task<IActionResult> ImportCocoAsync(
        [FromQuery] Guid documentId,
        [FromForm] IFormFile file,
        CancellationToken ct = default)
    {
        if (file == null) return BadRequest(new { message = "File is required." });
        var sizeError = _uploadValidator.ValidateSize(file);
        if (sizeError != null) return BadRequest(new { message = sizeError });

        var upload = await ReadUploadAsync(file, ct);
        var result = await _export.ImportCocoAsync(documentId, IsAdmin(), upload, ct);
        return result.ToActionResult();
    }

    [HttpPost("import/yolo")]
    public async Task<IActionResult> ImportYoloAsync(
        [FromQuery] Guid documentId,
        [FromForm] List<IFormFile> files,
        CancellationToken ct = default)
    {
        if (files != null && files.Count > 0)
        {
            var sizeError = _uploadValidator.ValidateSizeBatch(files);
            if (sizeError != null) return BadRequest(new { message = sizeError });
        }

        var uploads = await ReadUploadsAsync(files, ct);
        var result = await _export.ImportYoloAsync(documentId, IsAdmin(), uploads, ct);
        return result.ToActionResult();
    }

    private IActionResult ArtifactResult(ServiceResult<ExportArtifact> result)
    {
        if (!result.IsSuccess) return result.ToActionResult();
        var a = result.Value!;
        return File(a.Content, a.ContentType, a.FileName);
    }

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(userIdClaim, out var userId) ? userId : Guid.Empty;
    }

    private bool IsAdmin()
    {
        var roleClaim = User.FindFirstValue(ClaimTypes.Role);
        return !string.IsNullOrEmpty(roleClaim)
            && roleClaim.Equals(UserRole.Admin.ToString(), StringComparison.OrdinalIgnoreCase);
    }

    private static async Task<UploadedFile> ReadUploadAsync(IFormFile file, CancellationToken ct)
    {
        if (file == null || file.Length == 0)
            return new UploadedFile(Array.Empty<byte>(), "", "application/octet-stream");
        using var ms = new MemoryStream();
        await file.CopyToAsync(ms, ct);
        return new UploadedFile(ms.ToArray(), file.FileName, file.ContentType ?? "application/octet-stream");
    }

    private static async Task<IReadOnlyList<UploadedFile>> ReadUploadsAsync(
        List<IFormFile> files, CancellationToken ct)
    {
        if (files == null || files.Count == 0) return Array.Empty<UploadedFile>();
        var list = new List<UploadedFile>(files.Count);
        foreach (var f in files)
        {
            if (f.Length == 0) continue;
            using var ms = new MemoryStream();
            await f.CopyToAsync(ms, ct);
            list.Add(new UploadedFile(ms.ToArray(), f.FileName, f.ContentType ?? "application/octet-stream"));
        }
        return list;
    }
}
