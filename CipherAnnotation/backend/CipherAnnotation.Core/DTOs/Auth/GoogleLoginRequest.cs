using System.ComponentModel.DataAnnotations;

namespace CipherAnnotation.Core.DTOs.Auth;

/// <summary>
/// Request object for Google OAuth login.
/// </summary>
public record GoogleLoginRequest
{
    /// <summary>
    /// Gets or sets the Google ID token for authentication.
    /// </summary>
    [Required]
    [StringLength(4096)]
    public required string IdToken { get; init; }
}
