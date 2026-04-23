using AutoMapper;
using CipherAnnotation.Core.DTOs.Document;
using CipherAnnotation.Core.Entities;
using CipherAnnotation.Core.Enums;
using CipherAnnotation.Core.Interfaces;
using CipherAnnotation.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace CipherAnnotation.API.Controllers;

/// <summary>
/// API controller for document management operations.
/// </summary>
[ApiController]
[Route("api/documents")]
[Authorize]
public class DocumentsController : ControllerBase
{
    private readonly IDocumentRepository _documentRepository;
    private readonly IUserRepository _userRepository;
    private readonly IFileStorageService _fileStorage;
    private readonly IMapper _mapper;
    private readonly ILogger<DocumentsController> _logger;
    private readonly AppDbContext _dbContext;

    /// <summary>
    /// Initializes a new instance of the DocumentsController.
    /// </summary>
    public DocumentsController(
        IDocumentRepository documentRepository,
        IUserRepository userRepository,
        IFileStorageService fileStorage,
        IMapper mapper,
        ILogger<DocumentsController> logger,
        AppDbContext dbContext)
    {
        _documentRepository = documentRepository ?? throw new ArgumentNullException(nameof(documentRepository));
        _userRepository = userRepository ?? throw new ArgumentNullException(nameof(userRepository));
        _fileStorage = fileStorage ?? throw new ArgumentNullException(nameof(fileStorage));
        _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
    }

    /// <summary>
    /// Gets all documents owned by or shared with the current user.
    /// </summary>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of documents accessible to the current user.</returns>
    /// <response code="200">Documents retrieved successfully.</response>
    /// <response code="401">User is not authenticated.</response>
    /// <response code="500">An internal server error occurred.</response>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<DocumentDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<IEnumerable<DocumentDto>>> GetUserDocumentsAsync(
        CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == Guid.Empty)
            {
                return Unauthorized();
            }

            var ownedDocuments = await _documentRepository.GetByOwnerIdAsync(userId, cancellationToken);
            var sharedDocuments = await _documentRepository.GetSharedWithUserAsync(userId, cancellationToken);

            var allDocuments = ownedDocuments.Concat(sharedDocuments).DistinctBy(d => d.Id);
            var documentDtos = allDocuments.Select(MapDocumentToDto);

            return Ok(documentDtos);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while retrieving user documents.");
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { message = "An error occurred while retrieving documents." });
        }
    }

    /// <summary>
    /// Gets all public documents in the system.
    /// </summary>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of all public documents.</returns>
    /// <response code="200">Public documents retrieved successfully.</response>
    /// <response code="500">An internal server error occurred.</response>
    [HttpGet("public")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(IEnumerable<DocumentDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<IEnumerable<DocumentDto>>> GetPublicDocumentsAsync(
        CancellationToken cancellationToken = default)
    {
        try
        {
            var publicDocuments = await _documentRepository.GetPublicDocumentsAsync(cancellationToken);
            var documentDtos = publicDocuments.Select(MapDocumentToDto);

            return Ok(documentDtos);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while retrieving public documents.");
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { message = "An error occurred while retrieving public documents." });
        }
    }

    /// <summary>
    /// Gets a specific document by ID with authorization checks.
    /// </summary>
    /// <param name="id">The document ID.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The requested document.</returns>
    /// <response code="200">Document retrieved successfully.</response>
    /// <response code="401">User is not authenticated.</response>
    /// <response code="403">User does not have access to this document.</response>
    /// <response code="404">Document not found.</response>
    /// <response code="500">An internal server error occurred.</response>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(DocumentDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<DocumentDto>> GetDocumentByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var document = await _documentRepository.GetByIdAsync(id, cancellationToken);
            if (document == null)
            {
                _logger.LogWarning("Document {DocumentId} not found.", id);
                return NotFound(new { message = "Document not found." });
            }

            var userId = GetCurrentUserId();
            if (!CanAccessDocument(document, userId))
            {
                _logger.LogWarning("User {UserId} attempted to access document {DocumentId} without permission.", userId, id);
                return Forbid();
            }

            var documentDto = MapDocumentToDto(document);
            return Ok(documentDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while retrieving document {DocumentId}.", id);
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { message = "An error occurred while retrieving the document." });
        }
    }

    /// <summary>
    /// Creates a new document with metadata and page images.
    /// </summary>
    /// <param name="request">The document creation request (form data with metadata and images).</param>
    /// <param name="files">The page image files to upload.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The created document.</returns>
    /// <response code="201">Document created successfully.</response>
    /// <response code="400">Invalid request.</response>
    /// <response code="401">User is not authenticated.</response>
    /// <response code="500">An internal server error occurred.</response>
    [HttpPost]
    [ProducesResponseType(typeof(DocumentDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<DocumentDto>> CreateDocumentAsync(
        [FromForm] CreateDocumentRequest request,
        [FromForm] List<IFormFile> files,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var userId = GetCurrentUserId();
            if (userId == Guid.Empty)
            {
                return Unauthorized();
            }

            if (files == null || files.Count == 0)
            {
                return BadRequest(new { message = "At least one image file is required." });
            }

            var visibility = Enum.TryParse<Visibility>(request.Visibility, out var vis)
                ? vis
                : Visibility.Private;

            var document = new Document
            {
                Id = Guid.NewGuid(),
                Title = request.Title,
                Description = request.Description,
                OriginCountry = request.OriginCountry,
                Author = request.Author,
                Language = request.Language,
                Visibility = visibility,
                OwnerId = userId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _documentRepository.AddAsync(document, cancellationToken);

            int pageNumber = 1;
            foreach (var file in files)
            {
                if (file.Length == 0)
                    continue;

                var bytes = await ReadFileAsync(file, cancellationToken);
                var blobId = await _fileStorage.SaveAsync(bytes, file.FileName, file.ContentType ?? "application/octet-stream", cancellationToken);
                var (width, height) = GetImageDimensions(bytes);

                var page = new Page
                {
                    Id = Guid.NewGuid(),
                    DocumentId = document.Id,
                    PageNumber = pageNumber,
                    ImageBlobId = blobId,
                    Width = width,
                    Height = height,
                    Orientation = 0,
                    ResolutionDPI = 300,
                    CreatedAt = DateTime.UtcNow
                };

                document.Pages.Add(page);
                pageNumber++;
            }

            await _documentRepository.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Document {DocumentId} created by user {UserId} with {PageCount} pages.",
                document.Id, userId, pageNumber - 1);

            var documentDto = MapDocumentToDto(document);
            return StatusCode(StatusCodes.Status201Created, documentDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while creating a document.");
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { message = "An error occurred while creating the document." });
        }
    }

    /// <summary>
    /// Updates document metadata.
    /// </summary>
    /// <param name="id">The document ID.</param>
    /// <param name="request">The update request.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The updated document.</returns>
    /// <response code="200">Document updated successfully.</response>
    /// <response code="400">Invalid request.</response>
    /// <response code="401">User is not authenticated.</response>
    /// <response code="403">User does not own this document.</response>
    /// <response code="404">Document not found.</response>
    /// <response code="500">An internal server error occurred.</response>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(DocumentDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<DocumentDto>> UpdateDocumentAsync(
        Guid id,
        [FromBody] UpdateDocumentRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var userId = GetCurrentUserId();
            if (userId == Guid.Empty)
            {
                return Unauthorized();
            }

            var document = await _documentRepository.GetByIdAsync(id, cancellationToken);
            if (document == null)
            {
                _logger.LogWarning("Document {DocumentId} not found.", id);
                return NotFound(new { message = "Document not found." });
            }

            if (document.OwnerId != userId)
            {
                _logger.LogWarning("User {UserId} attempted to update document {DocumentId} without ownership.", userId, id);
                return Forbid();
            }

            if (!string.IsNullOrEmpty(request.Title))
                document.Title = request.Title;
            if (request.Description != null)
                document.Description = request.Description;
            if (request.OriginCountry != null)
                document.OriginCountry = request.OriginCountry;
            if (request.Author != null)
                document.Author = request.Author;
            if (request.Language != null)
                document.Language = request.Language;
            if (!string.IsNullOrEmpty(request.Visibility))
            {
                if (Enum.TryParse<Visibility>(request.Visibility, out var vis))
                    document.Visibility = vis;
            }

            document.UpdatedAt = DateTime.UtcNow;
            _documentRepository.Update(document);
            await _documentRepository.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Document {DocumentId} updated by user {UserId}.", id, userId);

            var documentDto = MapDocumentToDto(document);
            return Ok(documentDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while updating document {DocumentId}.", id);
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { message = "An error occurred while updating the document." });
        }
    }

    /// <summary>
    /// Deletes a document and all associated pages and annotations.
    /// </summary>
    /// <param name="id">The document ID.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>No content on success.</returns>
    /// <response code="204">Document deleted successfully.</response>
    /// <response code="401">User is not authenticated.</response>
    /// <response code="403">User does not own this document.</response>
    /// <response code="404">Document not found.</response>
    /// <response code="500">An internal server error occurred.</response>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> DeleteDocumentAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == Guid.Empty)
            {
                return Unauthorized();
            }

            var document = await _documentRepository.GetByIdAsync(id, cancellationToken);
            if (document == null)
            {
                _logger.LogWarning("Document {DocumentId} not found.", id);
                return NotFound(new { message = "Document not found." });
            }

            if (document.OwnerId != userId)
            {
                _logger.LogWarning("User {UserId} attempted to delete document {DocumentId} without ownership.", userId, id);
                return Forbid();
            }

            _documentRepository.Delete(document);
            await _documentRepository.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Document {DocumentId} deleted by user {UserId}.", id, userId);

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while deleting document {DocumentId}.", id);
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { message = "An error occurred while deleting the document." });
        }
    }

    /// <summary>
    /// Shares a document with another user.
    /// </summary>
    /// <param name="id">The document ID.</param>
    /// <param name="request">The share request with user email and permission type.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The created share information.</returns>
    /// <response code="201">Document shared successfully.</response>
    /// <response code="400">Invalid request.</response>
    /// <response code="401">User is not authenticated.</response>
    /// <response code="403">User does not own this document.</response>
    /// <response code="404">Document or user not found.</response>
    /// <response code="500">An internal server error occurred.</response>
    [HttpPost("{id:guid}/share")]
    [ProducesResponseType(typeof(DocumentShareDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<DocumentShareDto>> ShareDocumentAsync(
        Guid id,
        [FromBody] ShareDocumentRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var userId = GetCurrentUserId();
            if (userId == Guid.Empty)
            {
                return Unauthorized();
            }

            var document = await _documentRepository.GetByIdAsync(id, cancellationToken);
            if (document == null)
            {
                _logger.LogWarning("Document {DocumentId} not found.", id);
                return NotFound(new { message = "Document not found." });
            }

            if (document.OwnerId != userId)
            {
                _logger.LogWarning("User {UserId} attempted to share document {DocumentId} without ownership.", userId, id);
                return Forbid();
            }

            var sharedWithUser = await _userRepository.GetByEmailAsync(request.UserEmail, cancellationToken);
            if (sharedWithUser == null)
            {
                _logger.LogWarning("User with email {Email} not found.", request.UserEmail);
                return NotFound(new { message = "User not found." });
            }

            if (sharedWithUser.Id == userId)
            {
                return BadRequest(new { message = "Cannot share document with yourself." });
            }

            var permission = Enum.TryParse<PermissionType>(request.Permission, out var perm)
                ? perm
                : PermissionType.Read;

            var documentShare = new DocumentShare
            {
                Id = Guid.NewGuid(),
                DocumentId = id,
                UserId = sharedWithUser.Id,
                Permission = permission,
                SharedAt = DateTime.UtcNow
            };

            document.Shares.Add(documentShare);
            _documentRepository.Update(document);
            await _documentRepository.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Document {DocumentId} shared by user {UserId} with {SharedWith} with {Permission} permission.",
                id, userId, request.UserEmail, permission);

            var shareDto = new DocumentShareDto
            {
                Id = documentShare.Id,
                DocumentId = documentShare.DocumentId,
                UserId = documentShare.UserId,
                UserEmail = sharedWithUser.Email,
                Permission = documentShare.Permission.ToString(),
                SharedAt = documentShare.SharedAt
            };

            return CreatedAtAction(nameof(ShareDocumentAsync), shareDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while sharing document {DocumentId}.", id);
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { message = "An error occurred while sharing the document." });
        }
    }

    /// <summary>
    /// Gets all shares for a document.
    /// </summary>
    /// <param name="id">The document ID.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A list of document shares.</returns>
    /// <response code="200">Returns the list of shares.</response>
    /// <response code="401">User is not authenticated.</response>
    /// <response code="403">User does not own this document.</response>
    /// <response code="404">Document not found.</response>
    /// <response code="500">An internal server error occurred.</response>
    [HttpGet("{id:guid}/shares")]
    [ProducesResponseType(typeof(IEnumerable<DocumentShareDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<IEnumerable<DocumentShareDto>>> GetSharesAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == Guid.Empty)
            {
                return Unauthorized();
            }

            var document = await _documentRepository.GetByIdAsync(id, cancellationToken);
            if (document == null)
            {
                return NotFound(new { message = "Document not found." });
            }

            if (document.OwnerId != userId)
            {
                return Forbid();
            }

            var shares = document.Shares.Select(s => new DocumentShareDto
            {
                Id = s.Id,
                DocumentId = s.DocumentId,
                UserId = s.UserId,
                UserEmail = s.User?.Email ?? "",
                Permission = s.Permission.ToString(),
                SharedAt = s.SharedAt
            });

            return Ok(shares);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while fetching shares for document {DocumentId}.", id);
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { message = "An error occurred while fetching shares." });
        }
    }

    /// <summary>
    /// Removes document sharing for a specific user.
    /// </summary>
    /// <param name="id">The document ID.</param>
    /// <param name="shareId">The share record ID.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>No content on success.</returns>
    /// <response code="204">Share removed successfully.</response>
    /// <response code="401">User is not authenticated.</response>
    /// <response code="403">User does not own this document.</response>
    /// <response code="404">Document or share not found.</response>
    /// <response code="500">An internal server error occurred.</response>
    [HttpDelete("{id:guid}/share/{shareId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> RemoveShareAsync(
        Guid id,
        Guid shareId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == Guid.Empty)
            {
                return Unauthorized();
            }

            var document = await _documentRepository.GetByIdAsync(id, cancellationToken);
            if (document == null)
            {
                _logger.LogWarning("Document {DocumentId} not found.", id);
                return NotFound(new { message = "Document not found." });
            }

            if (document.OwnerId != userId)
            {
                _logger.LogWarning("User {UserId} attempted to remove share for document {DocumentId} without ownership.", userId, id);
                return Forbid();
            }

            var share = document.Shares.FirstOrDefault(s => s.Id == shareId);
            if (share == null)
            {
                _logger.LogWarning("Share {ShareId} not found for document {DocumentId}.", shareId, id);
                return NotFound(new { message = "Share not found." });
            }

            document.Shares.Remove(share);
            _documentRepository.Update(document);
            await _documentRepository.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Share {ShareId} for document {DocumentId} removed by user {UserId}.", shareId, id, userId);

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while removing share {ShareId} for document {DocumentId}.", shareId, id);
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { message = "An error occurred while removing the share." });
        }
    }

    // Helper methods

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(userIdClaim, out var userId) ? userId : Guid.Empty;
    }

    private bool CanAccessDocument(Document document, Guid userId)
    {
        return document.OwnerId == userId ||
               document.Visibility == Visibility.Public ||
               document.Shares.Any(s => s.UserId == userId);
    }

    private DocumentDto MapDocumentToDto(Document document)
    {
        var firstPage = document.Pages?.OrderBy(p => p.PageNumber).FirstOrDefault();
        var thumbnailUrl = firstPage != null
            ? $"/documents/{document.Id}/pages/{firstPage.Id}/image"
            : null;

        return new DocumentDto
        {
            Id = document.Id,
            Title = document.Title,
            Description = document.Description,
            OriginCountry = document.OriginCountry,
            Author = document.Author,
            Language = document.Language,
            Visibility = document.Visibility.ToString(),
            OwnerId = document.OwnerId,
            OwnerName = document.Owner?.Name ?? "Unknown",
            CreatedAt = document.CreatedAt,
            UpdatedAt = document.UpdatedAt,
            PageCount = document.Pages?.Count ?? 0,
            ThumbnailUrl = thumbnailUrl
        };
    }

    private static async Task<byte[]> ReadFileAsync(IFormFile file, CancellationToken cancellationToken)
    {
        using var ms = new MemoryStream();
        await file.CopyToAsync(ms, cancellationToken);
        return ms.ToArray();
    }

    private static (int width, int height) GetImageDimensions(byte[] bytes)
    {
        try
        {
            using var image = SixLabors.ImageSharp.Image.Load(bytes);
            return (image.Width, image.Height);
        }
        catch
        {
            return (1024, 1024);
        }
    }
}
