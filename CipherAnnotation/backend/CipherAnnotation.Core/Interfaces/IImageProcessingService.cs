namespace CipherAnnotation.Core.Interfaces;

/// <summary>
/// Service interface for image processing operations. All operations work
/// on raw byte arrays so callers do not need filesystem access.
/// </summary>
public interface IImageProcessingService
{
    Task<byte[]> BinarizeAsync(byte[] input, CancellationToken cancellationToken = default);

    Task<byte[]> AdjustContrastAsync(byte[] input, float contrastFactor, CancellationToken cancellationToken = default);

    Task<byte[]> RotateAsync(byte[] input, float angleInDegrees, CancellationToken cancellationToken = default);

    Task<byte[]> RemoveNoiseAsync(byte[] input, CancellationToken cancellationToken = default);

    Task<byte[]> ThresholdAsync(byte[] input, float threshold = 0.5f, CancellationToken cancellationToken = default);

    Task<byte[]> ScaleAsync(byte[] input, float scaleFactor, CancellationToken cancellationToken = default);

    Task<byte[]> GrayscaleAsync(byte[] input, CancellationToken cancellationToken = default);
}
