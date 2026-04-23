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
    public required string Title { get; init; }

    /// <summary>
    /// Gets or sets the description of the document.
    /// </summary>
    public string? Description { get; init; }

    /// <summary>
    /// Gets or sets the origin country of the document.
    /// </summary>
    public string? OriginCountry { get; init; }

    /// <summary>
    /// Gets or sets the author of the document.
    /// </summary>
    public string? Author { get; init; }

    /// <summary>
    /// Gets or sets the language of the document.
    /// </summary>
    public string? Language { get; init; }

    /// <summary>
    /// Gets or sets the visibility level of the document.
    /// </summary>
    [RegularExpression("^(Private|Public)$")]
    public string Visibility { get; init; } = "Private";
}
