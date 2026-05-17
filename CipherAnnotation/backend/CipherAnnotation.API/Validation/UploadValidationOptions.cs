namespace CipherAnnotation.API.Validation;

public sealed class UploadValidationOptions
{
    public const string SectionName = "FileStorage";

    public int MaxFileSizeMB { get; init; } = 50;
    public int MaxPagesPerDocument { get; init; } = 500;
    public string[] AllowedImageMimeTypes { get; init; } =
        new[] { "image/jpeg", "image/png", "image/webp", "image/tiff", "image/bmp" };

    public long MaxFileSizeBytes => (long)MaxFileSizeMB * 1024 * 1024;
}
