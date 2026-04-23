namespace CipherAnnotation.Core.DTOs.Export;

/// <summary>
/// Response object containing export file details.
/// </summary>
public record ExportResponse
{
    /// <summary>
    /// Gets or sets the name of the exported file.
    /// </summary>
    public required string FileName { get; init; }

    /// <summary>
    /// Gets or sets the URL to download the exported file.
    /// </summary>
    public required string FileUrl { get; init; }

    /// <summary>
    /// Gets or sets the export format used.
    /// </summary>
    public required string Format { get; init; }

    /// <summary>
    /// Gets or sets the total number of annotations included in the export.
    /// </summary>
    public required int TotalAnnotations { get; init; }

    /// <summary>
    /// Gets or sets the date and time when the export was created.
    /// </summary>
    public required DateTime ExportedAt { get; init; }
}
