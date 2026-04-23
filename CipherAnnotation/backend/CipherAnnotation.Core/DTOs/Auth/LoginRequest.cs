using System.ComponentModel.DataAnnotations;

namespace CipherAnnotation.Core.DTOs.Auth;

/// <summary>
/// Request object for user login.
/// </summary>
public record LoginRequest
{
    /// <summary>
    /// Gets or sets the email address of the user.
    /// </summary>
    [Required]
    [EmailAddress]
    public required string Email { get; init; }

    /// <summary>
    /// Gets or sets the password for the user account.
    /// </summary>
    [Required]
    public required string Password { get; init; }
}
