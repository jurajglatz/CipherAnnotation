namespace CipherAnnotation.Core.DTOs.Annotation;

public record AutoAnnotateAllResponse
{
    public required int AppliedCount { get; init; }

    public required int FailedCount { get; init; }

    public required int TotalCreated { get; init; }
}
