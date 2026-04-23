using CipherAnnotation.Core.DTOs.Export;
using CipherAnnotation.Core.Enums;
using CipherAnnotation.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace CipherAnnotation.API.Controllers;

/// <summary>
/// API controller for annotation export and import operations.
/// </summary>
[ApiController]
[Route("api/export")]
[Authorize]
public class ExportController : ControllerBase
{
    private readonly IDocumentRepository _documentRepository;
    private readonly IExportService _exportService;
    private readonly ILogger<ExportController> _logger;

    /// <summary>
    /// Initializes a new instance of the ExportController.
    /// </summary>
    public ExportController(
        IDocumentRepository documentRepository,
        IExportService exportService,
        ILogger<ExportController> logger)
    {
        _documentRepository = documentRepository ?? throw new ArgumentNullException(nameof(documentRepository));
        _exportService = exportService ?? throw new ArgumentNullException(nameof(exportService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Exports annotations in COCO format.
    /// </summary>
    /// <param name="request">The export request with document IDs.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The exported COCO file as a download.</returns>
    /// <response code="200">Export completed successfully.</response>
    /// <response code="400">Invalid request.</response>
    /// <response code="401">User is not authenticated.</response>
    /// <response code="403">User does not have access to one or more documents.</response>
    /// <response code="404">One or more documents not found.</response>
    /// <response code="500">An internal server error occurred.</response>
    [HttpPost("coco")]
    [ProducesResponseType(typeof(FileResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> ExportCocoAsync(
        [FromBody] ExportRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var userId = GetCurrentUserId();
            if (userId == Guid.Empty)
            {
                return Unauthorized();
            }

            if (request.DocumentIds == null || request.DocumentIds.Count == 0)
            {
                return BadRequest(new { message = "At least one document ID is required." });
            }

            var outputFolder = Path.Combine(
                Directory.GetCurrentDirectory(),
                "exports",
                DateTime.UtcNow.Ticks.ToString());
            Directory.CreateDirectory(outputFolder);

            var fileName = $"export_coco_{DateTime.UtcNow:yyyyMMdd_HHmmss}.json";
            var filePath = Path.Combine(outputFolder, fileName);

            try
            {
                foreach (var documentId in request.DocumentIds.Take(1))
                {
                    var document = await _documentRepository.GetByIdAsync(documentId, cancellationToken);
                    if (document == null)
                    {
                        _logger.LogWarning("Document {DocumentId} not found.", documentId);
                        return NotFound(new { message = $"Document {documentId} not found." });
                    }

                    if (!CanAccessDocument(document, userId))
                    {
                        _logger.LogWarning("User {UserId} attempted to export document {DocumentId} without permission.", userId, documentId);
                        return Forbid();
                    }

                    await _exportService.ExportCocoAsync(documentId, filePath, cancellationToken);
                }

                if (!System.IO.File.Exists(filePath))
                {
                    return StatusCode(StatusCodes.Status500InternalServerError,
                        new { message = "Export file was not created." });
                }

                var fileBytes = await System.IO.File.ReadAllBytesAsync(filePath, cancellationToken);
                var contentType = "application/json";

                _logger.LogInformation("COCO export completed for {DocumentCount} documents by user {UserId}.",
                    request.DocumentIds.Count, userId);

                return File(fileBytes, contentType, fileName);
            }
            finally
            {
                try
                {
                    if (System.IO.File.Exists(filePath))
                        System.IO.File.Delete(filePath);
                    if (Directory.Exists(outputFolder))
                        Directory.Delete(outputFolder);
                }
                catch
                {
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while exporting annotations to COCO format.");
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { message = "An error occurred while exporting annotations." });
        }
    }

    /// <summary>
    /// Exports annotations in YOLO format.
    /// </summary>
    /// <param name="request">The export request with document IDs.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The exported YOLO files as a download (ZIP archive).</returns>
    /// <response code="200">Export completed successfully.</response>
    /// <response code="400">Invalid request.</response>
    /// <response code="401">User is not authenticated.</response>
    /// <response code="403">User does not have access to one or more documents.</response>
    /// <response code="404">One or more documents not found.</response>
    /// <response code="500">An internal server error occurred.</response>
    [HttpPost("yolo")]
    [ProducesResponseType(typeof(FileResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> ExportYoloAsync(
        [FromBody] ExportRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var userId = GetCurrentUserId();
            if (userId == Guid.Empty)
            {
                return Unauthorized();
            }

            if (request.DocumentIds == null || request.DocumentIds.Count == 0)
            {
                return BadRequest(new { message = "At least one document ID is required." });
            }

            var outputFolder = Path.Combine(
                Directory.GetCurrentDirectory(),
                "exports",
                DateTime.UtcNow.Ticks.ToString());
            Directory.CreateDirectory(outputFolder);

            var yoloFolder = Path.Combine(outputFolder, "yolo");
            Directory.CreateDirectory(yoloFolder);

            try
            {
                foreach (var documentId in request.DocumentIds.Take(1))
                {
                    var document = await _documentRepository.GetByIdAsync(documentId, cancellationToken);
                    if (document == null)
                    {
                        _logger.LogWarning("Document {DocumentId} not found.", documentId);
                        return NotFound(new { message = $"Document {documentId} not found." });
                    }

                    if (!CanAccessDocument(document, userId))
                    {
                        _logger.LogWarning("User {UserId} attempted to export document {DocumentId} without permission.", userId, documentId);
                        return Forbid();
                    }

                    await _exportService.ExportYoloAsync(documentId, yoloFolder, request.TrainTestSplit, cancellationToken);
                }

                if (!Directory.Exists(yoloFolder) || Directory.GetFiles(yoloFolder).Length == 0)
                {
                    return StatusCode(StatusCodes.Status500InternalServerError,
                        new { message = "Export files were not created." });
                }

                var zipFileName = $"export_yolo_{DateTime.UtcNow:yyyyMMdd_HHmmss}.zip";
                var zipPath = Path.Combine(outputFolder, zipFileName);

                CreateZipArchive(yoloFolder, zipPath);

                if (!System.IO.File.Exists(zipPath))
                {
                    return StatusCode(StatusCodes.Status500InternalServerError,
                        new { message = "ZIP archive creation failed." });
                }

                var fileBytes = await System.IO.File.ReadAllBytesAsync(zipPath, cancellationToken);
                var contentType = "application/zip";

                _logger.LogInformation("YOLO export completed for {DocumentCount} documents by user {UserId}.",
                    request.DocumentIds.Count, userId);

                return File(fileBytes, contentType, zipFileName);
            }
            finally
            {
                try
                {
                    if (Directory.Exists(outputFolder))
                        Directory.Delete(outputFolder, true);
                }
                catch
                {
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while exporting annotations to YOLO format.");
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { message = "An error occurred while exporting annotations." });
        }
    }

    /// <summary>
    /// Exports annotations in TFRecord format (binary tf.train.Example records).
    /// </summary>
    /// <param name="request">The export request with document IDs.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The exported TFRecord dataset as a ZIP download.</returns>
    [HttpPost("tfrecord")]
    [ProducesResponseType(typeof(FileResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> ExportTfRecordAsync(
        [FromBody] ExportRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var userId = GetCurrentUserId();
            if (userId == Guid.Empty)
            {
                return Unauthorized();
            }

            if (request.DocumentIds == null || request.DocumentIds.Count == 0)
            {
                return BadRequest(new { message = "At least one document ID is required." });
            }

            var outputFolder = Path.Combine(
                Directory.GetCurrentDirectory(),
                "exports",
                DateTime.UtcNow.Ticks.ToString());
            Directory.CreateDirectory(outputFolder);

            var tfFolder = Path.Combine(outputFolder, "tfrecord");
            Directory.CreateDirectory(tfFolder);

            try
            {
                foreach (var documentId in request.DocumentIds.Take(1))
                {
                    var document = await _documentRepository.GetByIdAsync(documentId, cancellationToken);
                    if (document == null)
                    {
                        _logger.LogWarning("Document {DocumentId} not found.", documentId);
                        return NotFound(new { message = $"Document {documentId} not found." });
                    }

                    if (!CanAccessDocument(document, userId))
                    {
                        _logger.LogWarning("User {UserId} attempted to export document {DocumentId} without permission.", userId, documentId);
                        return Forbid();
                    }

                    await _exportService.ExportTfRecordAsync(documentId, tfFolder, request.TrainTestSplit, cancellationToken);
                }

                if (!Directory.Exists(tfFolder) || Directory.GetFiles(tfFolder).Length == 0)
                {
                    return StatusCode(StatusCodes.Status500InternalServerError,
                        new { message = "Export files were not created." });
                }

                var zipFileName = $"export_tfrecord_{DateTime.UtcNow:yyyyMMdd_HHmmss}.zip";
                var zipPath = Path.Combine(outputFolder, zipFileName);
                CreateZipArchive(tfFolder, zipPath);

                if (!System.IO.File.Exists(zipPath))
                {
                    return StatusCode(StatusCodes.Status500InternalServerError,
                        new { message = "ZIP archive creation failed." });
                }

                var fileBytes = await System.IO.File.ReadAllBytesAsync(zipPath, cancellationToken);

                _logger.LogInformation("TFRecord export completed for {DocumentCount} documents by user {UserId}.",
                    request.DocumentIds.Count, userId);

                return File(fileBytes, "application/zip", zipFileName);
            }
            finally
            {
                try
                {
                    if (Directory.Exists(outputFolder))
                        Directory.Delete(outputFolder, true);
                }
                catch
                {
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while exporting annotations to TFRecord format.");
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { message = "An error occurred while exporting annotations." });
        }
    }

    /// <summary>
    /// Imports annotations from COCO dataset format (Admin only).
    /// </summary>
    /// <param name="documentId">The target document ID to import annotations into.</param>
    /// <param name="file">The COCO JSON file to import.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A success message with import statistics.</returns>
    /// <response code="200">Import completed successfully.</response>
    /// <response code="400">Invalid request.</response>
    /// <response code="401">User is not authenticated.</response>
    /// <response code="403">User is not an administrator.</response>
    /// <response code="404">Document not found.</response>
    /// <response code="500">An internal server error occurred.</response>
    [HttpPost("import/coco")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> ImportCocoAsync(
        [FromQuery] Guid documentId,
        [FromForm] IFormFile file,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (!IsAdmin())
            {
                _logger.LogWarning("Non-admin user attempted to import COCO data.");
                return Forbid();
            }

            if (file == null || file.Length == 0)
            {
                return BadRequest(new { message = "COCO JSON file is required." });
            }

            var document = await _documentRepository.GetByIdAsync(documentId, cancellationToken);
            if (document == null)
            {
                _logger.LogWarning("Document {DocumentId} not found.", documentId);
                return NotFound(new { message = "Document not found." });
            }

            var tempFolder = Path.Combine(
                Directory.GetCurrentDirectory(),
                "temp_imports",
                DateTime.UtcNow.Ticks.ToString());
            Directory.CreateDirectory(tempFolder);

            var filePath = Path.Combine(tempFolder, file.FileName);

            try
            {
                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await file.CopyToAsync(stream, cancellationToken);
                }

                await _exportService.ImportCocoAsync(documentId, filePath, cancellationToken);

                _logger.LogInformation("COCO import completed for document {DocumentId}.", documentId);

                return Ok(new
                {
                    message = "COCO data imported successfully.",
                    documentId = documentId,
                    importedAt = DateTime.UtcNow
                });
            }
            finally
            {
                try
                {
                    if (Directory.Exists(tempFolder))
                        Directory.Delete(tempFolder, true);
                }
                catch
                {
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while importing COCO data into document {DocumentId}.", documentId);
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { message = "An error occurred while importing COCO data." });
        }
    }

    /// <summary>
    /// Imports annotations from YOLO dataset format (Admin only).
    /// </summary>
    /// <param name="documentId">The target document ID to import annotations into.</param>
    /// <param name="files">The YOLO format files to import.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A success message with import statistics.</returns>
    /// <response code="200">Import completed successfully.</response>
    /// <response code="400">Invalid request.</response>
    /// <response code="401">User is not authenticated.</response>
    /// <response code="403">User is not an administrator.</response>
    /// <response code="404">Document not found.</response>
    /// <response code="500">An internal server error occurred.</response>
    [HttpPost("import/yolo")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> ImportYoloAsync(
        [FromQuery] Guid documentId,
        [FromForm] List<IFormFile> files,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (!IsAdmin())
            {
                _logger.LogWarning("Non-admin user attempted to import YOLO data.");
                return Forbid();
            }

            if (files == null || files.Count == 0)
            {
                return BadRequest(new { message = "YOLO format files are required." });
            }

            var document = await _documentRepository.GetByIdAsync(documentId, cancellationToken);
            if (document == null)
            {
                _logger.LogWarning("Document {DocumentId} not found.", documentId);
                return NotFound(new { message = "Document not found." });
            }

            var tempFolder = Path.Combine(
                Directory.GetCurrentDirectory(),
                "temp_imports",
                DateTime.UtcNow.Ticks.ToString());
            Directory.CreateDirectory(tempFolder);

            try
            {
                foreach (var file in files)
                {
                    if (file.Length > 0)
                    {
                        var filePath = Path.Combine(tempFolder, file.FileName);
                        using (var stream = new FileStream(filePath, FileMode.Create))
                        {
                            await file.CopyToAsync(stream, cancellationToken);
                        }
                    }
                }

                await _exportService.ImportYoloAsync(documentId, tempFolder, cancellationToken);

                _logger.LogInformation("YOLO import completed for document {DocumentId}.", documentId);

                return Ok(new
                {
                    message = "YOLO data imported successfully.",
                    documentId = documentId,
                    importedAt = DateTime.UtcNow
                });
            }
            finally
            {
                try
                {
                    if (Directory.Exists(tempFolder))
                        Directory.Delete(tempFolder, true);
                }
                catch
                {
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while importing YOLO data into document {DocumentId}.", documentId);
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { message = "An error occurred while importing YOLO data." });
        }
    }

    // Helper methods

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(userIdClaim, out var userId) ? userId : Guid.Empty;
    }

    private bool IsAdmin()
    {
        var roleClaim = User.FindFirstValue(ClaimTypes.Role);
        return !string.IsNullOrEmpty(roleClaim) && roleClaim.Equals(UserRole.Admin.ToString(), StringComparison.OrdinalIgnoreCase);
    }

    private bool CanAccessDocument(Core.Entities.Document document, Guid userId)
    {
        return document.OwnerId == userId ||
               document.Visibility == Visibility.Public ||
               document.Shares.Any(s => s.UserId == userId);
    }

    private void CreateZipArchive(string sourceFolder, string zipPath)
    {
        try
        {
            System.IO.Compression.ZipFile.CreateFromDirectory(sourceFolder, zipPath);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating ZIP archive from {SourceFolder}", sourceFolder);
            throw;
        }
    }
}
