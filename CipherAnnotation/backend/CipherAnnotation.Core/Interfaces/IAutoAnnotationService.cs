namespace CipherAnnotation.Core.Interfaces;

/// <summary>One detection from the YOLO sidecar in source-image pixel coordinates.</summary>
public record AutoDetection(
    string ClassName,
    float X1,
    float Y1,
    float X2,
    float Y2,
    float Confidence);

/// <summary>
/// Runs the YOLOv11 cipher-key detector against an image and returns
/// hierarchical detections (sections / pairs / elements).
/// </summary>
public interface IAutoAnnotationService
{
    Task<IReadOnlyList<AutoDetection>> DetectAsync(
        byte[] imageBytes,
        string fileExtension,
        CancellationToken cancellationToken = default);
}
