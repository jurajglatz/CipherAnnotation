namespace CipherAnnotation.Core.DTOs.Caption;

public record CaptionDto
{
    public required Guid Id { get; init; }
    public required Guid DocumentId { get; init; }
    public required string Name { get; init; }
    public required int UsageCount { get; init; }
    public required DateTime CreatedAt { get; init; }
}
