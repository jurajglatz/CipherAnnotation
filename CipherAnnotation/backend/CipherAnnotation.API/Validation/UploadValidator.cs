using Microsoft.Extensions.Options;

namespace CipherAnnotation.API.Validation;

/// <summary>
/// Validates inbound image uploads: per-file size, allowed MIME type,
/// and (optionally) batch size against MaxPagesPerDocument.
/// </summary>
public sealed class UploadValidator
{
    private readonly UploadValidationOptions _options;

    public UploadValidator(IOptions<UploadValidationOptions> options)
    {
        _options = options.Value;
    }

    /// <summary>Returns null if valid; otherwise an error message suitable for a 400 response.</summary>
    public string? Validate(IFormFile file)
    {
        if (file.Length == 0)
            return $"File '{file.FileName}' is empty.";

        if (file.Length > _options.MaxFileSizeBytes)
            return $"File '{file.FileName}' exceeds the {_options.MaxFileSizeMB} MB limit.";

        var contentType = file.ContentType ?? string.Empty;
        if (!_options.AllowedImageMimeTypes.Contains(contentType, StringComparer.OrdinalIgnoreCase))
            return $"File '{file.FileName}' has unsupported MIME type '{contentType}'. " +
                   $"Allowed: {string.Join(", ", _options.AllowedImageMimeTypes)}.";

        return null;
    }

    /// <summary>Size-only check (no MIME filter) — for non-image uploads like COCO/YOLO annotation files.</summary>
    public string? ValidateSize(IFormFile file)
    {
        if (file.Length == 0)
            return $"File '{file.FileName}' is empty.";
        if (file.Length > _options.MaxFileSizeBytes)
            return $"File '{file.FileName}' exceeds the {_options.MaxFileSizeMB} MB limit.";
        return null;
    }

    public string? ValidateSizeBatch(IReadOnlyList<IFormFile> files)
    {
        if (files.Count > _options.MaxPagesPerDocument)
            return $"Too many files ({files.Count}). Maximum is {_options.MaxPagesPerDocument} per request.";
        foreach (var file in files)
        {
            var error = ValidateSize(file);
            if (error != null) return error;
        }
        return null;
    }

    public string? ValidateBatch(IReadOnlyList<IFormFile> files)
    {
        if (files.Count > _options.MaxPagesPerDocument)
            return $"Too many files ({files.Count}). Maximum is {_options.MaxPagesPerDocument} per request.";

        foreach (var file in files)
        {
            var error = Validate(file);
            if (error != null) return error;
        }
        return null;
    }
}
