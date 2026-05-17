using CipherAnnotation.Core.Common;
using CipherAnnotation.Core.DTOs.Document;
using CipherAnnotation.Core.Entities;
using CipherAnnotation.Core.Enums;
using CipherAnnotation.Core.Interfaces;
using CipherAnnotation.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CipherAnnotation.Infrastructure.Services.Documents;

public class DocumentService : IDocumentService
{
    private readonly IDocumentRepository _documentRepository;
    private readonly IUserRepository _userRepository;
    private readonly IFileStorageService _fileStorage;
    private readonly AppDbContext _dbContext;
    private readonly ILogger<DocumentService> _logger;

    public DocumentService(
        IDocumentRepository documentRepository,
        IUserRepository userRepository,
        IFileStorageService fileStorage,
        AppDbContext dbContext,
        ILogger<DocumentService> logger)
    {
        _documentRepository = documentRepository;
        _userRepository = userRepository;
        _fileStorage = fileStorage;
        _dbContext = dbContext;
        _logger = logger;
    }

    public async Task<ServiceResult<IEnumerable<DocumentDto>>> GetUserDocumentsAsync(
        Guid userId, CancellationToken ct = default)
    {
        var owned = await _documentRepository.GetByOwnerIdAsync(userId, ct);
        var shared = await _documentRepository.GetSharedWithUserAsync(userId, ct);
        var all = owned.Concat(shared).DistinctBy(d => d.Id).Select(d => MapToDto(d, userId));
        return ServiceResult<IEnumerable<DocumentDto>>.Success(all);
    }

    public async Task<ServiceResult<IEnumerable<DocumentDto>>> GetPublicDocumentsAsync(
        Guid? currentUserId, CancellationToken ct = default)
    {
        var docs = await _documentRepository.GetPublicDocumentsAsync(ct);
        var dtos = docs.Select(d => MapToDto(d, currentUserId ?? Guid.Empty));
        return ServiceResult<IEnumerable<DocumentDto>>.Success(dtos);
    }

    public async Task<ServiceResult<DocumentDto>> GetByIdAsync(
        Guid documentId, Guid currentUserId, CancellationToken ct = default)
    {
        var document = await _documentRepository.GetByIdAsync(documentId, ct);
        if (document == null)
        {
            _logger.LogWarning("Document {DocumentId} not found.", documentId);
            return ServiceResult<DocumentDto>.NotFound("Document not found.");
        }

        if (!CanAccessDocument(document, currentUserId))
        {
            _logger.LogWarning("User {UserId} attempted to access document {DocumentId} without permission.",
                currentUserId, documentId);
            return ServiceResult<DocumentDto>.Forbidden();
        }

        return ServiceResult<DocumentDto>.Success(MapToDto(document, currentUserId));
    }

    public async Task<ServiceResult<DocumentDto>> CreateAsync(
        Guid ownerId,
        CreateDocumentRequest request,
        IReadOnlyList<UploadedFile> files,
        CancellationToken ct = default)
    {
        if (files == null || files.Count == 0)
        {
            return ServiceResult<DocumentDto>.BadRequest("At least one image file is required.");
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
            OwnerId = ownerId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        await _documentRepository.AddAsync(document, ct);

        int pageNumber = 1;
        foreach (var file in files)
        {
            if (file.Content.Length == 0)
                continue;

            var blobId = await _fileStorage.SaveAsync(
                file.Content, file.FileName, file.ContentType, ct);
            var (width, height) = GetImageDimensions(file.Content);

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
                CreatedAt = DateTime.UtcNow,
            };

            document.Pages.Add(page);
            pageNumber++;
        }

        var seedNames = new[] { "Section", "Pair", "Element" };
        var now = DateTime.UtcNow;
        foreach (var (name, idx) in seedNames.Select((n, i) => (n, i)))
        {
            document.Captions.Add(new Caption
            {
                DocumentId = document.Id,
                Name = name,
                CreatedAt = now.AddMilliseconds(idx),
            });
        }

        await _documentRepository.SaveChangesAsync(ct);

        _logger.LogInformation("Document {DocumentId} created by user {UserId} with {PageCount} pages.",
            document.Id, ownerId, pageNumber - 1);

        return ServiceResult<DocumentDto>.Success(MapToDto(document, ownerId));
    }

    public async Task<ServiceResult<DocumentDto>> UpdateAsync(
        Guid documentId, Guid currentUserId,
        UpdateDocumentRequest request, CancellationToken ct = default)
    {
        var document = await _documentRepository.GetByIdAsync(documentId, ct);
        if (document == null)
        {
            _logger.LogWarning("Document {DocumentId} not found.", documentId);
            return ServiceResult<DocumentDto>.NotFound("Document not found.");
        }

        if (document.OwnerId != currentUserId)
        {
            _logger.LogWarning("User {UserId} attempted to update document {DocumentId} without ownership.",
                currentUserId, documentId);
            return ServiceResult<DocumentDto>.Forbidden();
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
        if (!string.IsNullOrEmpty(request.Visibility) &&
            Enum.TryParse<Visibility>(request.Visibility, out var vis))
        {
            document.Visibility = vis;
        }

        document.UpdatedAt = DateTime.UtcNow;
        _documentRepository.Update(document);
        await _documentRepository.SaveChangesAsync(ct);

        _logger.LogInformation("Document {DocumentId} updated by user {UserId}.", documentId, currentUserId);

        return ServiceResult<DocumentDto>.Success(MapToDto(document, currentUserId));
    }

    public async Task<ServiceResult> DeleteAsync(
        Guid documentId, Guid currentUserId, CancellationToken ct = default)
    {
        var document = await _documentRepository.GetByIdAsync(documentId, ct);
        if (document == null)
        {
            _logger.LogWarning("Document {DocumentId} not found.", documentId);
            return ServiceResult.NotFound("Document not found.");
        }

        if (document.OwnerId != currentUserId)
        {
            _logger.LogWarning("User {UserId} attempted to delete document {DocumentId} without ownership.",
                currentUserId, documentId);
            return ServiceResult.Forbidden();
        }

        _documentRepository.Delete(document);
        await _documentRepository.SaveChangesAsync(ct);

        _logger.LogInformation("Document {DocumentId} deleted by user {UserId}.", documentId, currentUserId);
        return ServiceResult.Success();
    }

    public async Task<ServiceResult<DocumentShareDto>> ShareAsync(
        Guid documentId, Guid currentUserId,
        ShareDocumentRequest request, CancellationToken ct = default)
    {
        var document = await _documentRepository.GetByIdAsync(documentId, ct);
        if (document == null)
        {
            _logger.LogWarning("Document {DocumentId} not found.", documentId);
            return ServiceResult<DocumentShareDto>.NotFound("Document not found.");
        }

        if (document.OwnerId != currentUserId)
        {
            _logger.LogWarning("User {UserId} attempted to share document {DocumentId} without ownership.",
                currentUserId, documentId);
            return ServiceResult<DocumentShareDto>.Forbidden();
        }

        var sharedWithUser = await _userRepository.GetByEmailAsync(request.UserEmail, ct);
        if (sharedWithUser == null)
        {
            _logger.LogWarning("User with email {Email} not found.", request.UserEmail);
            return ServiceResult<DocumentShareDto>.NotFound("User not found.");
        }

        if (sharedWithUser.Id == currentUserId)
            return ServiceResult<DocumentShareDto>.BadRequest("Cannot share document with yourself.");

        if (document.Shares.Any(s => s.UserId == sharedWithUser.Id))
            return ServiceResult<DocumentShareDto>.BadRequest("Document is already shared with this user.");

        var permission = Enum.TryParse<PermissionType>(request.Permission, out var perm)
            ? perm
            : PermissionType.Read;

        var documentShare = new DocumentShare
        {
            DocumentId = documentId,
            UserId = sharedWithUser.Id,
            Permission = permission,
            SharedAt = DateTime.UtcNow,
        };

        _dbContext.DocumentShares.Add(documentShare);
        await _dbContext.SaveChangesAsync(ct);

        _logger.LogInformation("Document {DocumentId} shared by user {UserId} with {SharedWith} with {Permission}.",
            documentId, currentUserId, request.UserEmail, permission);

        return ServiceResult<DocumentShareDto>.Success(new DocumentShareDto
        {
            Id = documentShare.Id,
            DocumentId = documentShare.DocumentId,
            UserId = documentShare.UserId,
            UserEmail = sharedWithUser.Email,
            Permission = documentShare.Permission.ToString(),
            SharedAt = documentShare.SharedAt,
        });
    }

    public async Task<ServiceResult<IEnumerable<DocumentShareDto>>> GetSharesAsync(
        Guid documentId, Guid currentUserId, CancellationToken ct = default)
    {
        var document = await _documentRepository.GetByIdAsync(documentId, ct);
        if (document == null)
            return ServiceResult<IEnumerable<DocumentShareDto>>.NotFound("Document not found.");

        if (document.OwnerId != currentUserId)
            return ServiceResult<IEnumerable<DocumentShareDto>>.Forbidden();

        var shares = document.Shares.Select(s => new DocumentShareDto
        {
            Id = s.Id,
            DocumentId = s.DocumentId,
            UserId = s.UserId,
            UserEmail = s.User?.Email ?? "",
            Permission = s.Permission.ToString(),
            SharedAt = s.SharedAt,
        });

        return ServiceResult<IEnumerable<DocumentShareDto>>.Success(shares);
    }

    public async Task<ServiceResult> RemoveShareAsync(
        Guid documentId, Guid shareId, Guid currentUserId, CancellationToken ct = default)
    {
        var document = await _documentRepository.GetByIdAsync(documentId, ct);
        if (document == null)
        {
            _logger.LogWarning("Document {DocumentId} not found.", documentId);
            return ServiceResult.NotFound("Document not found.");
        }

        if (document.OwnerId != currentUserId)
        {
            _logger.LogWarning("User {UserId} attempted to remove share for document {DocumentId} without ownership.",
                currentUserId, documentId);
            return ServiceResult.Forbidden();
        }

        var share = document.Shares.FirstOrDefault(s => s.Id == shareId);
        if (share == null)
        {
            _logger.LogWarning("Share {ShareId} not found for document {DocumentId}.", shareId, documentId);
            return ServiceResult.NotFound("Share not found.");
        }

        _dbContext.DocumentShares.Remove(share);
        await _documentRepository.SaveChangesAsync(ct);

        _logger.LogInformation("Share {ShareId} for document {DocumentId} removed by user {UserId}.",
            shareId, documentId, currentUserId);
        return ServiceResult.Success();
    }

    public async Task<ServiceResult<DocumentDto>> DuplicateAsync(
        Guid documentId, Guid currentUserId, CancellationToken ct = default)
    {
        var source = await _dbContext.Documents
            .Include(d => d.Pages)
                .ThenInclude(p => p.Annotations)
                    .ThenInclude(a => a.BoundingBox)
            .Include(d => d.Captions)
            .Include(d => d.Shares)
            .FirstOrDefaultAsync(d => d.Id == documentId, ct);

        if (source == null)
            return ServiceResult<DocumentDto>.NotFound("Document not found.");

        if (!CanAccessDocument(source, currentUserId))
            return ServiceResult<DocumentDto>.Forbidden();

        var now = DateTime.UtcNow;
        var newDoc = new Document
        {
            Id = Guid.NewGuid(),
            Title = $"{source.Title} (Copy)",
            Description = source.Description,
            OriginCountry = source.OriginCountry,
            Author = source.Author,
            Language = source.Language,
            Visibility = Visibility.Private,
            OwnerId = currentUserId,
            CreatedAt = now,
            UpdatedAt = now,
        };
        _dbContext.Documents.Add(newDoc);

        var captionIdMap = new Dictionary<Guid, Guid>();
        foreach (var caption in source.Captions.OrderBy(c => c.CreatedAt))
        {
            var newCaptionId = Guid.NewGuid();
            captionIdMap[caption.Id] = newCaptionId;
            _dbContext.Captions.Add(new Caption
            {
                Id = newCaptionId,
                DocumentId = newDoc.Id,
                Name = caption.Name,
                CreatedAt = now,
            });
        }

        var annotationIdMap = new Dictionary<Guid, Guid>();
        var clonedAnnotations = new List<(Annotation src, Annotation copy)>();

        foreach (var page in source.Pages.OrderBy(p => p.PageNumber))
        {
            var newPage = new Page
            {
                Id = Guid.NewGuid(),
                DocumentId = newDoc.Id,
                PageNumber = page.PageNumber,
                ImageBlobId = page.ImageBlobId,
                Width = page.Width,
                Height = page.Height,
                Orientation = page.Orientation,
                ResolutionDPI = page.ResolutionDPI,
                CreatedAt = now,
            };
            _dbContext.Pages.Add(newPage);

            foreach (var annotation in page.Annotations)
            {
                if (!captionIdMap.TryGetValue(annotation.CaptionId, out var mappedCaptionId))
                    continue;

                var newAnnotationId = Guid.NewGuid();
                annotationIdMap[annotation.Id] = newAnnotationId;

                var copy = new Annotation
                {
                    Id = newAnnotationId,
                    PageId = newPage.Id,
                    CaptionId = mappedCaptionId,
                    Type = annotation.Type,
                    Content = annotation.Content,
                    Transcription = annotation.Transcription,
                    Orientation = annotation.Orientation,
                    CreatedAt = now,
                };
                _dbContext.Annotations.Add(copy);

                if (annotation.BoundingBox != null)
                {
                    _dbContext.BoundingBoxes.Add(new BoundingBox
                    {
                        Id = Guid.NewGuid(),
                        AnnotationId = newAnnotationId,
                        X = annotation.BoundingBox.X,
                        Y = annotation.BoundingBox.Y,
                        Width = annotation.BoundingBox.Width,
                        Height = annotation.BoundingBox.Height,
                    });
                }

                clonedAnnotations.Add((annotation, copy));
            }
        }

        foreach (var (src, copy) in clonedAnnotations)
        {
            if (src.ParentId.HasValue && annotationIdMap.TryGetValue(src.ParentId.Value, out var newParentId))
                copy.ParentId = newParentId;
            if (src.TranscriptionRefId.HasValue && annotationIdMap.TryGetValue(src.TranscriptionRefId.Value, out var newRefId))
                copy.TranscriptionRefId = newRefId;
        }

        await _dbContext.SaveChangesAsync(ct);

        _logger.LogInformation("Document {SourceId} duplicated as {NewId} by user {UserId}.",
            documentId, newDoc.Id, currentUserId);

        var reloaded = await _documentRepository.GetByIdAsync(newDoc.Id, ct);
        return ServiceResult<DocumentDto>.Success(MapToDto(reloaded ?? newDoc, currentUserId));
    }

    // Helpers

    private static bool CanAccessDocument(Document document, Guid userId) =>
        document.OwnerId == userId ||
        document.Visibility == Visibility.Public ||
        document.Shares.Any(s => s.UserId == userId);

    private static DocumentDto MapToDto(Document document, Guid currentUserId)
    {
        var firstPage = document.Pages?.OrderBy(p => p.PageNumber).FirstOrDefault();
        var thumbnailUrl = firstPage != null
            ? $"/documents/{document.Id}/pages/{firstPage.Id}/image"
            : null;

        string myPermission;
        if (currentUserId != Guid.Empty && document.OwnerId == currentUserId)
        {
            myPermission = "Owner";
        }
        else
        {
            var share = currentUserId == Guid.Empty
                ? null
                : document.Shares?.FirstOrDefault(s => s.UserId == currentUserId);
            if (share != null)
                myPermission = share.Permission == PermissionType.Edit ? "Edit" : "Read";
            else if (document.Visibility == Visibility.Public)
                myPermission = "Read";
            else
                myPermission = "None";
        }

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
            ThumbnailUrl = thumbnailUrl,
            MyPermission = myPermission,
        };
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
