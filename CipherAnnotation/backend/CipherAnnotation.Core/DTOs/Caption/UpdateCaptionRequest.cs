using System.ComponentModel.DataAnnotations;

namespace CipherAnnotation.Core.DTOs.Caption;

public record UpdateCaptionRequest
{
    [Required, StringLength(100)]
    public required string Name { get; init; }
}
