namespace CipherAnnotation.Core.Interfaces;

/// <summary>
/// Service interface for exporting and importing annotation data in various formats.
/// </summary>
public interface IExportService
{
    /// <summary>
    /// Exports document annotations to COCO format asynchronously.
    /// </summary>
    /// <param name="documentId">The unique identifier of the document to export.</param>
    /// <param name="outputPath">The file path for the output COCO JSON file.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    Task ExportCocoAsync(Guid documentId, string outputPath, CancellationToken cancellationToken = default);

    /// <summary>
    /// Exports document annotations to YOLO format asynchronously.
    /// </summary>
    /// <param name="documentId">The unique identifier of the document to export.</param>
    /// <param name="outputPath">The directory path for the output YOLO files.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    Task ExportYoloAsync(Guid documentId, string outputPath, float trainTestSplit = 0.8f, CancellationToken cancellationToken = default);

    /// <summary>
    /// Exports document annotations to TFRecord format asynchronously.
    /// </summary>
    /// <param name="documentId">The unique identifier of the document to export.</param>
    /// <param name="outputPath">The directory path for the output TFRecord files.</param>
    /// <param name="trainTestSplit">The train/test split ratio in range 0.0-1.0.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    Task ExportTfRecordAsync(Guid documentId, string outputPath, float trainTestSplit = 0.8f, CancellationToken cancellationToken = default);

    /// <summary>
    /// Imports annotations from COCO format asynchronously.
    /// </summary>
    /// <param name="documentId">The unique identifier of the document to import annotations for.</param>
    /// <param name="cocoJsonPath">The file path to the COCO JSON file.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    Task ImportCocoAsync(Guid documentId, string cocoJsonPath, CancellationToken cancellationToken = default);

    /// <summary>
    /// Imports annotations from YOLO format asynchronously.
    /// </summary>
    /// <param name="documentId">The unique identifier of the document to import annotations for.</param>
    /// <param name="yoloDirectoryPath">The directory path containing YOLO format files.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    Task ImportYoloAsync(Guid documentId, string yoloDirectoryPath, CancellationToken cancellationToken = default);
}
