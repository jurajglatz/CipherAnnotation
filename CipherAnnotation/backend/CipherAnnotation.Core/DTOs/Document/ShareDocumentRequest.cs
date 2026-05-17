using System.ComponentModel.DataAnnotations;

namespace CipherAnnotation.Core.DTOs.Document;

/// <summary>
/// Request object for sharing a document with another user.
/// </summary>
public record ShareDocumentRequest
{
    /// <summary>
    /// Gets or sets the email address of the user to share the document with.
    /// </summary>
    [Required]
    [EmailAddress]
    [StringLength(256)]
    public required string UserEmail { get; init; }

    /// <summary>
    /// Gets or sets the permission type to grant to the user.
    /// </summary>
    [Required]
    [RegularExpression("^(Read|Edit)$")]
    public required string Permission { get; init; }
}
