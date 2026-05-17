using System.ComponentModel.DataAnnotations;

namespace CipherAnnotation.Core.DTOs.Document;

/// <summary>
/// Request object for creating a new document.
/// </summary>
public record CreateDocumentRequest
{
    /// <summary>
    /// Gets or sets the title of the document.
    /// </summary>
    [Required]
    [StringLength(256, MinimumLength = 1)]
    public required string Title { get; init; }

    /// <summary>
    /// Gets or sets the description of the document.
    /// </summary>
    [StringLength(4096)]
    public string? Description { get; init; }

    /// <summary>
    /// Gets or sets the origin country of the document.
    /// </summary>
    [StringLength(128)]
    public string? OriginCountry { get; init; }

    /// <summary>
    /// Gets or sets the author of the document.
    /// </summary>
    [StringLength(256)]
    public string? Author { get; init; }

    /// <summary>
    /// Gets or sets the language of the document.
    /// </summary>
    [StringLength(64)]
    public string? Language { get; init; }

    /// <summary>
    /// Gets or sets the visibility level of the document.
    /// </summary>
    [RegularExpression("^(Private|Public)$")]
    public string Visibility { get; init; } = "Private";
}
