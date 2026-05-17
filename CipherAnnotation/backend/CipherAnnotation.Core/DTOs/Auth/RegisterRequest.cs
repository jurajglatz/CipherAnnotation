using System.ComponentModel.DataAnnotations;

namespace CipherAnnotation.Core.DTOs.Auth;

/// <summary>
/// Request object for user registration.
/// </summary>
public record RegisterRequest
{
    /// <summary>
    /// Gets or sets the email address of the user.
    /// </summary>
    [Required]
    [EmailAddress]
    [StringLength(256)]
    public required string Email { get; init; }

    /// <summary>
    /// Gets or sets the password for the user account.
    /// </summary>
    [Required]
    [StringLength(128, MinimumLength = 6)]
    public required string Password { get; init; }

    /// <summary>
    /// Gets or sets the full name of the user.
    /// </summary>
    [Required]
    [StringLength(128, MinimumLength = 1)]
    public required string Name { get; init; }
}
