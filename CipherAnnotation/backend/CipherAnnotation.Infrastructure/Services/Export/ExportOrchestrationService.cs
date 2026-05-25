using System.IO.Compression;
using CipherAnnotation.Core.Common;
using CipherAnnotation.Core.DTOs.Document;
using CipherAnnotation.Core.DTOs.Export;
using CipherAnnotation.Core.Entities;
using CipherAnnotation.Core.Enums;
using CipherAnnotation.Core.Interfaces;
using CipherAnnotation.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CipherAnnotation.Infrastructure.Services.Export;

public class ExportOrchestrationService : IExportOrchestrationService
{
    private readonly AppDbContext _dbContext;
    private readonly IExportService _exportService;
    private readonly ILogger<ExportOrchestrationService> _logger;

    public ExportOrchestrationService(
        AppDbContext dbContext,
        IExportService exportService,
        ILogger<ExportOrchestrationService> logger)
    {
        _dbContext = dbContext;
        _exportService = exportService;
        _logger = logger;
    }

    private Task<Document?> LoadDocumentAsync(Guid documentId, CancellationToken ct) =>
        _dbContext.Documents.IncludeDetails()
            .FirstOrDefaultAsync(d => d.Id == documentId, ct);

    public Task<ServiceResult<ExportArtifact>> ExportCocoAsync(
        Guid currentUserId, ExportRequest request, CancellationToken ct = default) =>
        RunExportAsync(currentUserId, request, ct, async (documentId, folder) =>
        {
            var timestamp = DateTime.UtcNow.ToString("yyyyMMdd_HHmmss");

            // Annotations only: return the bare COCO JSON (current behaviour).
            if (!request.IncludeImages)
            {
                var fileName = $"export_coco_{timestamp}.json";
                var filePath = Path.Combine(folder, fileName);
                await _exportService.ExportCocoAsync(documentId, filePath, imagesDirectory: null, ct);
                if (!File.Exists(filePath))
                    return ServiceResult<ExportArtifact>.BadRequest("Export file was not created.");
                var bytes = await File.ReadAllBytesAsync(filePath, ct);
                return ServiceResult<ExportArtifact>.Success(
                    new ExportArtifact(bytes, "application/json", fileName));
            }

            // With images: write the JSON + images/ folder, then zip it.
            var cocoFolder = Path.Combine(folder, "coco");
            var imagesFolder = Path.Combine(cocoFolder, "images");
            Directory.CreateDirectory(cocoFolder);
            var jsonPath = Path.Combine(cocoFolder, "annotations.coco.json");
            await _exportService.ExportCocoAsync(documentId, jsonPath, imagesFolder, ct);

            if (!File.Exists(jsonPath))
                return ServiceResult<ExportArtifact>.BadRequest("Export files were not created.");

            var zipName = $"export_coco_{timestamp}.zip";
            var zipPath = Path.Combine(folder, zipName);
            ZipFile.CreateFromDirectory(cocoFolder, zipPath);
            var zipBytes = await File.ReadAllBytesAsync(zipPath, ct);
            return ServiceResult<ExportArtifact>.Success(
                new ExportArtifact(zipBytes, "application/zip", zipName));
        }, "COCO");

    public Task<ServiceResult<ExportArtifact>> ExportYoloAsync(
        Guid currentUserId, ExportRequest request, CancellationToken ct = default) =>
        RunExportAsync(currentUserId, request, ct, async (documentId, folder) =>
        {
            var yoloFolder = Path.Combine(folder, "yolo");
            Directory.CreateDirectory(yoloFolder);
            await _exportService.ExportYoloAsync(documentId, yoloFolder, request.TrainTestSplit, ct);

            if (!Directory.Exists(yoloFolder) || Directory.GetFiles(yoloFolder).Length == 0)
                return ServiceResult<ExportArtifact>.BadRequest("Export files were not created.");

            var zipName = $"export_yolo_{DateTime.UtcNow:yyyyMMdd_HHmmss}.zip";
            var zipPath = Path.Combine(folder, zipName);
            ZipFile.CreateFromDirectory(yoloFolder, zipPath);
            var bytes = await File.ReadAllBytesAsync(zipPath, ct);
            return ServiceResult<ExportArtifact>.Success(
                new ExportArtifact(bytes, "application/zip", zipName));
        }, "YOLO");

    public Task<ServiceResult<ExportArtifact>> ExportTfRecordAsync(
        Guid currentUserId, ExportRequest request, CancellationToken ct = default) =>
        RunExportAsync(currentUserId, request, ct, async (documentId, folder) =>
        {
            var tfFolder = Path.Combine(folder, "tfrecord");
            Directory.CreateDirectory(tfFolder);
            await _exportService.ExportTfRecordAsync(documentId, tfFolder, request.TrainTestSplit, ct);

            if (!Directory.Exists(tfFolder) || Directory.GetFiles(tfFolder).Length == 0)
                return ServiceResult<ExportArtifact>.BadRequest("Export files were not created.");

            var zipName = $"export_tfrecord_{DateTime.UtcNow:yyyyMMdd_HHmmss}.zip";
            var zipPath = Path.Combine(folder, zipName);
            ZipFile.CreateFromDirectory(tfFolder, zipPath);
            var bytes = await File.ReadAllBytesAsync(zipPath, ct);
            return ServiceResult<ExportArtifact>.Success(
                new ExportArtifact(bytes, "application/zip", zipName));
        }, "TFRecord");

    public async Task<ServiceResult<ImportResult>> ImportCocoAsync(
        Guid documentId, bool isAdmin, UploadedFile file, CancellationToken ct = default)
    {
        if (!isAdmin) return ServiceResult<ImportResult>.Forbidden();
        if (file == null || file.Content.Length == 0)
            return ServiceResult<ImportResult>.BadRequest("COCO JSON file is required.");

        var document = await LoadDocumentAsync(documentId, ct);
        if (document == null) return ServiceResult<ImportResult>.NotFound("Document not found.");

        var tempFolder = MakeTempFolder("temp_imports");
        try
        {
            var filePath = Path.Combine(tempFolder, file.FileName);
            await File.WriteAllBytesAsync(filePath, file.Content, ct);
            await _exportService.ImportCocoAsync(documentId, filePath, ct);

            _logger.LogInformation("COCO import completed for document {DocumentId}.", documentId);
            return ServiceResult<ImportResult>.Success(
                new ImportResult("COCO data imported successfully.", documentId, DateTime.UtcNow));
        }
        finally
        {
            TryDeleteDirectory(tempFolder);
        }
    }

    public async Task<ServiceResult<ImportResult>> ImportYoloAsync(
        Guid documentId, bool isAdmin,
        IReadOnlyList<UploadedFile> files, CancellationToken ct = default)
    {
        if (!isAdmin) return ServiceResult<ImportResult>.Forbidden();
        if (files == null || files.Count == 0)
            return ServiceResult<ImportResult>.BadRequest("YOLO format files are required.");

        var document = await LoadDocumentAsync(documentId, ct);
        if (document == null) return ServiceResult<ImportResult>.NotFound("Document not found.");

        var tempFolder = MakeTempFolder("temp_imports");
        try
        {
            foreach (var file in files)
            {
                if (file.Content.Length == 0) continue;
                var filePath = Path.Combine(tempFolder, file.FileName);
                await File.WriteAllBytesAsync(filePath, file.Content, ct);
            }

            await _exportService.ImportYoloAsync(documentId, tempFolder, ct);

            _logger.LogInformation("YOLO import completed for document {DocumentId}.", documentId);
            return ServiceResult<ImportResult>.Success(
                new ImportResult("YOLO data imported successfully.", documentId, DateTime.UtcNow));
        }
        finally
        {
            TryDeleteDirectory(tempFolder);
        }
    }

    private async Task<ServiceResult<ExportArtifact>> RunExportAsync(
        Guid currentUserId,
        ExportRequest request,
        CancellationToken ct,
        Func<Guid, string, Task<ServiceResult<ExportArtifact>>> work,
        string format)
    {
        if (currentUserId == Guid.Empty) return ServiceResult<ExportArtifact>.Unauthorized();
        if (request.DocumentIds == null || request.DocumentIds.Count == 0)
            return ServiceResult<ExportArtifact>.BadRequest("At least one document ID is required.");

        // Current behaviour exports only the first document (preserved from controller).
        var documentId = request.DocumentIds[0];
        var document = await LoadDocumentAsync(documentId, ct);
        if (document == null)
            return ServiceResult<ExportArtifact>.NotFound($"Document {documentId} not found.");
        if (!CanAccess(document, currentUserId))
        {
            _logger.LogWarning("User {UserId} attempted to export document {DocumentId} without permission.",
                currentUserId, documentId);
            return ServiceResult<ExportArtifact>.Forbidden();
        }

        var outputFolder = MakeTempFolder("exports");
        try
        {
            var result = await work(documentId, outputFolder);
            if (result.IsSuccess)
                _logger.LogInformation("{Format} export completed for document {DocumentId} by user {UserId}.",
                    format, documentId, currentUserId);
            return result;
        }
        finally
        {
            TryDeleteDirectory(outputFolder);
        }
    }

    private static string MakeTempFolder(string root)
    {
        var folder = Path.Combine(Directory.GetCurrentDirectory(), root, DateTime.UtcNow.Ticks.ToString());
        Directory.CreateDirectory(folder);
        return folder;
    }

    private static void TryDeleteDirectory(string folder)
    {
        try
        {
            if (Directory.Exists(folder)) Directory.Delete(folder, true);
        }
        catch
        {
        }
    }

    private static bool CanAccess(Document document, Guid userId) =>
        document.OwnerId == userId
        || document.Visibility == Visibility.Public
        || document.Shares.Any(s => s.UserId == userId);
}
