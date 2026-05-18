using CipherAnnotation.Core.Common;
using CipherAnnotation.Core.DTOs.Document;
using CipherAnnotation.Core.Interfaces;
using CipherAnnotation.Infrastructure.Services.Documents;
using Microsoft.Extensions.Logging.Abstractions;

namespace CipherAnnotation.Tests.Documents;

public class DocumentServiceTests
{
    private static AppDbContext NewCtx() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static (DocumentService svc, AppDbContext ctx, FakeStorage storage) NewService()
    {
        var ctx = NewCtx();
        var storage = new FakeStorage();
        var svc = new DocumentService(
            storage,
            ctx,
            NullLogger<DocumentService>.Instance);
        return (svc, ctx, storage);
    }

    private static User SeedUser(AppDbContext ctx, string email = "owner@example.com", string name = "Owner")
    {
        var user = new User { Id = Guid.NewGuid(), Email = email, Name = name };
        ctx.Users.Add(user);
        ctx.SaveChanges();
        return user;
    }

    private static Document SeedDoc(AppDbContext ctx, Guid ownerId, Visibility vis = Visibility.Private)
    {
        var doc = new Document
        {
            Id = Guid.NewGuid(),
            Title = "Doc",
            OwnerId = ownerId,
            Visibility = vis,
        };
        ctx.Documents.Add(doc);
        ctx.SaveChanges();
        return doc;
    }

    [Fact]
    public async Task GetByIdAsync_OwnerSeesDocument()
    {
        var (svc, ctx, _) = NewService();
        var owner = SeedUser(ctx);
        var doc = SeedDoc(ctx, owner.Id);

        var result = await svc.GetByIdAsync(doc.Id, owner.Id);

        result.IsSuccess.Should().BeTrue();
        result.Value!.MyPermission.Should().Be("Owner");
    }

    [Fact]
    public async Task GetByIdAsync_PrivateDocForOtherUser_Forbidden()
    {
        var (svc, ctx, _) = NewService();
        var owner = SeedUser(ctx);
        var other = SeedUser(ctx, "other@example.com", "Other");
        var doc = SeedDoc(ctx, owner.Id);

        var result = await svc.GetByIdAsync(doc.Id, other.Id);

        result.ErrorKind.Should().Be(ServiceErrorKind.Forbidden);
    }

    [Fact]
    public async Task GetByIdAsync_PublicDocVisibleToOthers()
    {
        var (svc, ctx, _) = NewService();
        var owner = SeedUser(ctx);
        var other = SeedUser(ctx, "other@example.com", "Other");
        var doc = SeedDoc(ctx, owner.Id, Visibility.Public);

        var result = await svc.GetByIdAsync(doc.Id, other.Id);

        result.IsSuccess.Should().BeTrue();
        result.Value!.MyPermission.Should().Be("Read");
    }

    [Fact]
    public async Task GetByIdAsync_Missing_NotFound()
    {
        var (svc, ctx, _) = NewService();
        var owner = SeedUser(ctx);

        var result = await svc.GetByIdAsync(Guid.NewGuid(), owner.Id);

        result.ErrorKind.Should().Be(ServiceErrorKind.NotFound);
    }

    [Fact]
    public async Task UpdateAsync_OwnerCanUpdatePartialFields()
    {
        var (svc, ctx, _) = NewService();
        var owner = SeedUser(ctx);
        var doc = SeedDoc(ctx, owner.Id);

        var result = await svc.UpdateAsync(doc.Id, owner.Id, new UpdateDocumentRequest
        {
            Title = "New Title",
            Description = "desc",
        });

        result.IsSuccess.Should().BeTrue();
        result.Value!.Title.Should().Be("New Title");
        result.Value.Description.Should().Be("desc");
    }

    [Fact]
    public async Task UpdateAsync_NonOwner_Forbidden()
    {
        var (svc, ctx, _) = NewService();
        var owner = SeedUser(ctx);
        var other = SeedUser(ctx, "other@example.com", "Other");
        var doc = SeedDoc(ctx, owner.Id);

        var result = await svc.UpdateAsync(doc.Id, other.Id,
            new UpdateDocumentRequest { Title = "x" });

        result.ErrorKind.Should().Be(ServiceErrorKind.Forbidden);
    }

    [Fact]
    public async Task DeleteAsync_OwnerSucceeds()
    {
        var (svc, ctx, _) = NewService();
        var owner = SeedUser(ctx);
        var doc = SeedDoc(ctx, owner.Id);

        var result = await svc.DeleteAsync(doc.Id, owner.Id);

        result.IsSuccess.Should().BeTrue();
        (await ctx.Documents.FindAsync(doc.Id)).Should().BeNull();
    }

    [Fact]
    public async Task DeleteAsync_NonOwner_Forbidden()
    {
        var (svc, ctx, _) = NewService();
        var owner = SeedUser(ctx);
        var other = SeedUser(ctx, "other@example.com", "Other");
        var doc = SeedDoc(ctx, owner.Id);

        var result = await svc.DeleteAsync(doc.Id, other.Id);

        result.ErrorKind.Should().Be(ServiceErrorKind.Forbidden);
    }

    [Fact]
    public async Task ShareAsync_HappyPath()
    {
        var (svc, ctx, _) = NewService();
        var owner = SeedUser(ctx);
        var target = SeedUser(ctx, "target@example.com", "Target");
        var doc = SeedDoc(ctx, owner.Id);

        var result = await svc.ShareAsync(doc.Id, owner.Id,
            new ShareDocumentRequest { UserEmail = "target@example.com", Permission = "Edit" });

        result.IsSuccess.Should().BeTrue();
        result.Value!.UserEmail.Should().Be("target@example.com");
        result.Value.Permission.Should().Be("Edit");
        ctx.DocumentShares.Count().Should().Be(1);
    }

    [Fact]
    public async Task ShareAsync_SelfShare_BadRequest()
    {
        var (svc, ctx, _) = NewService();
        var owner = SeedUser(ctx, "me@example.com");
        var doc = SeedDoc(ctx, owner.Id);

        var result = await svc.ShareAsync(doc.Id, owner.Id,
            new ShareDocumentRequest { UserEmail = "me@example.com", Permission = "Read" });

        result.ErrorKind.Should().Be(ServiceErrorKind.BadRequest);
    }

    [Fact]
    public async Task ShareAsync_UnknownEmail_NotFound()
    {
        var (svc, ctx, _) = NewService();
        var owner = SeedUser(ctx);
        var doc = SeedDoc(ctx, owner.Id);

        var result = await svc.ShareAsync(doc.Id, owner.Id,
            new ShareDocumentRequest { UserEmail = "ghost@example.com", Permission = "Read" });

        result.ErrorKind.Should().Be(ServiceErrorKind.NotFound);
    }

    [Fact]
    public async Task ShareAsync_DuplicateShare_BadRequest()
    {
        var (svc, ctx, _) = NewService();
        var owner = SeedUser(ctx);
        var target = SeedUser(ctx, "target@example.com", "Target");
        var doc = SeedDoc(ctx, owner.Id);
        ctx.DocumentShares.Add(new DocumentShare
        {
            DocumentId = doc.Id,
            UserId = target.Id,
            Permission = PermissionType.Read,
            SharedAt = DateTime.UtcNow,
        });
        await ctx.SaveChangesAsync();

        var result = await svc.ShareAsync(doc.Id, owner.Id,
            new ShareDocumentRequest { UserEmail = "target@example.com", Permission = "Read" });

        result.ErrorKind.Should().Be(ServiceErrorKind.BadRequest);
    }

    [Fact]
    public async Task DuplicateAsync_ClonesPagesAndAnnotations_RemapsRefs()
    {
        var (svc, ctx, _) = NewService();
        var owner = SeedUser(ctx);
        var doc = SeedDoc(ctx, owner.Id);

        var caption = new Caption { Id = Guid.NewGuid(), DocumentId = doc.Id, Name = "Section" };
        var page = new Page
        {
            Id = Guid.NewGuid(),
            DocumentId = doc.Id,
            PageNumber = 1,
            ImageBlobId = Guid.NewGuid(),
            Width = 10, Height = 10, Orientation = 0, ResolutionDPI = 72,
        };
        ctx.AddRange(caption, page);
        await ctx.SaveChangesAsync();

        var parent = new Annotation
        {
            Id = Guid.NewGuid(), PageId = page.Id, CaptionId = caption.Id,
            Type = AnnotationType.Text, Orientation = 0,
        };
        ctx.Add(parent);
        await ctx.SaveChangesAsync();

        var child = new Annotation
        {
            Id = Guid.NewGuid(), PageId = page.Id, CaptionId = caption.Id,
            Type = AnnotationType.Text, Orientation = 0,
            ParentId = parent.Id,
            TranscriptionRefId = parent.Id,
        };
        ctx.Add(child);
        ctx.BoundingBoxes.Add(new BoundingBox
        {
            Id = Guid.NewGuid(),
            AnnotationId = child.Id,
            X = 1, Y = 2, Width = 3, Height = 4,
        });
        await ctx.SaveChangesAsync();

        var result = await svc.DuplicateAsync(doc.Id, owner.Id);

        result.IsSuccess.Should().BeTrue();
        var newDocId = result.Value!.Id;

        var newPages = ctx.Pages.Where(p => p.DocumentId == newDocId).ToList();
        newPages.Should().HaveCount(1);
        var newAnnotations = ctx.Annotations
            .Where(a => a.PageId == newPages[0].Id)
            .ToList();
        newAnnotations.Should().HaveCount(2);

        var newParent = newAnnotations.Single(a => a.ParentId == null);
        var newChild = newAnnotations.Single(a => a.ParentId != null);
        newChild.ParentId.Should().Be(newParent.Id);
        newChild.TranscriptionRefId.Should().Be(newParent.Id);

        ctx.BoundingBoxes.Any(b => b.AnnotationId == newChild.Id).Should().BeTrue();
    }

    [Fact]
    public async Task DuplicateAsync_DoesNotCopyShares_VisibilityResetToPrivate()
    {
        var (svc, ctx, _) = NewService();
        var owner = SeedUser(ctx);
        var other = SeedUser(ctx, "other@example.com", "Other");
        var doc = SeedDoc(ctx, owner.Id, Visibility.Public);
        ctx.DocumentShares.Add(new DocumentShare
        {
            DocumentId = doc.Id,
            UserId = other.Id,
            Permission = PermissionType.Read,
            SharedAt = DateTime.UtcNow,
        });
        await ctx.SaveChangesAsync();

        var result = await svc.DuplicateAsync(doc.Id, owner.Id);

        result.IsSuccess.Should().BeTrue();
        result.Value!.Visibility.Should().Be("Private");
        ctx.DocumentShares.Count(s => s.DocumentId == result.Value.Id).Should().Be(0);
    }

    [Fact]
    public async Task RemoveShareAsync_OwnerCanRemove()
    {
        var (svc, ctx, _) = NewService();
        var owner = SeedUser(ctx);
        var target = SeedUser(ctx, "target@example.com", "Target");
        var doc = SeedDoc(ctx, owner.Id);
        var share = new DocumentShare
        {
            DocumentId = doc.Id,
            UserId = target.Id,
            Permission = PermissionType.Read,
            SharedAt = DateTime.UtcNow,
        };
        ctx.DocumentShares.Add(share);
        await ctx.SaveChangesAsync();

        var result = await svc.RemoveShareAsync(doc.Id, share.Id, owner.Id);

        result.IsSuccess.Should().BeTrue();
        ctx.DocumentShares.Any(s => s.Id == share.Id).Should().BeFalse();
    }

    private sealed class FakeStorage : IFileStorageService
    {
        public Task<Guid> SaveAsync(byte[] data, string fileName, string contentType, CancellationToken ct = default)
            => Task.FromResult(Guid.NewGuid());
        public Task<FileBlob?> GetAsync(Guid id, CancellationToken ct = default) => Task.FromResult<FileBlob?>(null);
        public Task<byte[]?> GetBytesAsync(Guid id, CancellationToken ct = default) => Task.FromResult<byte[]?>(null);
        public Task DeleteAsync(Guid id, CancellationToken ct = default) => Task.CompletedTask;
    }
}
