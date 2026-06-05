using CipherAnnotation.Core.Interfaces;
using Microsoft.Extensions.Logging;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Png;
using SixLabors.ImageSharp.Processing;

namespace CipherAnnotation.Infrastructure.Services.ImageProcessing;

/// <summary>
/// Service implementation for image processing operations using ImageSharp.
/// Operates on in-memory byte arrays; no filesystem access.
/// </summary>
public class ImageProcessingService : IImageProcessingService
{
    private readonly ILogger<ImageProcessingService> _logger;

    public ImageProcessingService(ILogger<ImageProcessingService> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    private static async Task<byte[]> ProcessAsync(byte[] input, Action<IImageProcessingContext> operation, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(input);
        if (input.Length == 0)
            throw new ArgumentException("Input image bytes are empty.", nameof(input));

        using var inStream = new MemoryStream(input, writable: false);
        using var image = await Image.LoadAsync(inStream, ct);
        image.Mutate(operation);

        using var outStream = new MemoryStream();
        await image.SaveAsync(outStream, new PngEncoder(), ct);
        return outStream.ToArray();
    }

    public Task<byte[]> BinarizeAsync(byte[] input, CancellationToken ct = default)
        => ProcessAsync(input, x => x.Grayscale().BinaryThreshold(0.5f), ct);

    public Task<byte[]> AdjustContrastAsync(byte[] input, float contrastFactor, CancellationToken ct = default)
    {
        if (contrastFactor <= 0)
            throw new ArgumentException("Contrast factor must be greater than 0.", nameof(contrastFactor));
        return ProcessAsync(input, x => x.Contrast(contrastFactor), ct);
    }

    public Task<byte[]> RotateAsync(byte[] input, float angleInDegrees, CancellationToken ct = default)
        => ProcessAsync(input, x => x.Rotate(angleInDegrees), ct);

    public Task<byte[]> RemoveNoiseAsync(byte[] input, CancellationToken ct = default)
        => ProcessAsync(input, x => x.GaussianBlur(1.0f), ct);

    public Task<byte[]> ThresholdAsync(byte[] input, float threshold = 0.5f, CancellationToken ct = default)
        => ProcessAsync(input, x => x.BinaryThreshold(threshold), ct);

    public Task<byte[]> ScaleAsync(byte[] input, float scaleFactor, CancellationToken ct = default)
    {
        if (scaleFactor <= 0)
            throw new ArgumentException("Scale factor must be greater than 0.", nameof(scaleFactor));
        return ProcessAsync(input, x =>
        {
            var size = x.GetCurrentSize();
            x.Resize((int)(size.Width * scaleFactor), (int)(size.Height * scaleFactor));
        }, ct);
    }

    public Task<byte[]> GrayscaleAsync(byte[] input, CancellationToken ct = default)
        => ProcessAsync(input, x => x.Grayscale(), ct);
}
