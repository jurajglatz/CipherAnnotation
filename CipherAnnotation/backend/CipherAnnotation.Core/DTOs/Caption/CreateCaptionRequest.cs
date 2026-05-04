using System.ComponentModel.DataAnnotations;

namespace CipherAnnotation.Core.DTOs.Caption;

public record CreateCaptionRequest
{
    [Required, StringLength(100)]
    public required string Name { get; init; }
}
