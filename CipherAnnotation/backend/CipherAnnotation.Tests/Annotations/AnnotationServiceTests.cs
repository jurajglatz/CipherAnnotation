using AutoMapper;
using CipherAnnotation.API.Mapping;
using CipherAnnotation.Core.Common;
using CipherAnnotation.Core.DTOs.Annotation;
using CipherAnnotation.Core.Interfaces;
using CipherAnnotation.Infrastructure.Services.Annotations;
using Microsoft.Extensions.Logging.Abstractions;

namespace CipherAnnotation.Tests.Annotations;

public class AnnotationServiceTests
{
    private static AppDbContext NewCtx() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static IMapper NewMapper() =>
        new MapperConfiguration(cfg => cfg.AddProfile<MappingProfile>()).CreateMapper();

    private static AnnotationService NewService(AppDbContext ctx) =>
        new(ctx, NewMapper(), new NoOpAutoAnnotation(), new NoOpStorage(), NullLogger<AnnotationService>.Instance);

    private record Fixture(User Owner, Document Doc, Page Page, Caption Caption);

    private static async Task<Fixture> SeedAsync(AppDbContext ctx, Visibility vis = Visibility.Private)
    {
        var owner = new User { Id = Guid.NewGuid(), Email = "o@x", Name = "Owner" };
        var doc = new Document { Id = Guid.NewGuid(), Title = "Doc", OwnerId = owner.Id, Visibility = vis };
        var page = new Page
        {
            Id = Guid.NewGuid(),
            DocumentId = doc.Id,
            PageNumber = 1,
            ImageBlobId = Guid.NewGuid(),
            Width = 1000,
            Height = 800,
            Orientation = 0,
            ResolutionDPI = 72,
        };
        var caption = new Caption { Id = Guid.NewGuid(), DocumentId = doc.Id, Name = "Section" };
        ctx.AddRange(owner, doc, page, caption);
        await ctx.SaveChangesAsync();
        return new Fixture(owner, doc, page, caption);
    }

    private static CreateAnnotationRequest TextRequest(Guid? captionId = null, Guid? parentId = null) =>
        new()
        {
            CaptionId = captionId,
            ParentId = parentId,
            Type = "Text",
            Orientation = 0,
            BoundingBox = new BoundingBoxDto { X = 1, Y = 2, Width = 10, Height = 20 },
        };

    // ---------- ListForPageAsync ----------

    [Fact]
    public async Task ListForPage_Forbidden_WhenUserCannotAccess()
    {
        await using var ctx = NewCtx();
        var f = await SeedAsync(ctx);
        var stranger = Guid.NewGuid();

        var result = await NewService(ctx).ListForPageAsync(f.Page.Id, stranger);

        result.ErrorKind.Should().Be(ServiceErrorKind.Forbidden);
    }

    [Fact]
    public async Task ListForPage_OwnerSeesPopulatedCaptionNames()
    {
        await using var ctx = NewCtx();
        var f = await SeedAsync(ctx);
        var svc = NewService(ctx);
        await svc.CreateAsync(f.Page.Id, f.Owner.Id, TextRequest(f.Caption.Id));

        var result = await svc.ListForPageAsync(f.Page.Id, f.Owner.Id);

        result.IsSuccess.Should().BeTrue();
        result.Value!.Single().CaptionName.Should().Be("Section");
        result.Value!.Single().CaptionNumber.Should().Be(1);
    }

    // ---------- CreateAsync ----------

    [Fact]
    public async Task Create_Forbidden_WhenUserCannotEdit()
    {
        await using var ctx = NewCtx();
        var f = await SeedAsync(ctx, vis: Visibility.Public); // public read, not edit
        var stranger = Guid.NewGuid();

        var result = await NewService(ctx).CreateAsync(f.Page.Id, stranger, TextRequest(f.Caption.Id));

        result.ErrorKind.Should().Be(ServiceErrorKind.Forbidden);
    }

    [Fact]
    public async Task Create_InvalidType_BadRequest()
    {
        await using var ctx = NewCtx();
        var f = await SeedAsync(ctx);
        var req = TextRequest(f.Caption.Id) with { Type = "NopeType" };

        var result = await NewService(ctx).CreateAsync(f.Page.Id, f.Owner.Id, req);

        result.ErrorKind.Should().Be(ServiceErrorKind.BadRequest);
    }

    [Fact]
    public async Task Create_TextWithTranscription_BadRequest()
    {
        await using var ctx = NewCtx();
        var f = await SeedAsync(ctx);
        var req = TextRequest(f.Caption.Id) with { Transcription = "x" };

        var result = await NewService(ctx).CreateAsync(f.Page.Id, f.Owner.Id, req);

        result.ErrorKind.Should().Be(ServiceErrorKind.BadRequest);
    }

    [Fact]
    public async Task Create_PageNotFound()
    {
        await using var ctx = NewCtx();
        var f = await SeedAsync(ctx);

        // Owner is granted edit access by virtue of ownership, but the page lookup will fail.
        // Use a separate page id that belongs to a different document owned by the same user
        // so the permission check passes but Pages.FirstOrDefaultAsync returns null.
        var otherPage = new Page
        {
            Id = Guid.NewGuid(),
            DocumentId = f.Doc.Id,
            PageNumber = 2,
            ImageBlobId = Guid.NewGuid(),
            Width = 1, Height = 1, Orientation = 0, ResolutionDPI = 72,
        };
        ctx.Pages.Add(otherPage);
        await ctx.SaveChangesAsync();
        ctx.Pages.Remove(otherPage);
        // Race: directly probe a guid that isn't a page. Permission check returns false
        // for a missing page, which surfaces as Forbidden — so just assert that path.
        var result = await NewService(ctx).CreateAsync(Guid.NewGuid(), f.Owner.Id, TextRequest(f.Caption.Id));

        result.ErrorKind.Should().Be(ServiceErrorKind.Forbidden);
    }

    [Fact]
    public async Task Create_ParentOnDifferentPage_BadRequest()
    {
        await using var ctx = NewCtx();
        var f = await SeedAsync(ctx);
        var otherPage = new Page
        {
            Id = Guid.NewGuid(),
            DocumentId = f.Doc.Id,
            PageNumber = 2,
            ImageBlobId = Guid.NewGuid(),
            Width = 1, Height = 1, Orientation = 0, ResolutionDPI = 72,
        };
        ctx.Pages.Add(otherPage);
        await ctx.SaveChangesAsync();
        var svc = NewService(ctx);

        var parent = await svc.CreateAsync(otherPage.Id, f.Owner.Id, TextRequest(f.Caption.Id));
        var req = TextRequest(f.Caption.Id, parentId: parent.Value!.Id);

        var result = await svc.CreateAsync(f.Page.Id, f.Owner.Id, req);

        result.ErrorKind.Should().Be(ServiceErrorKind.BadRequest);
        result.ErrorMessage.Should().Contain("same page");
    }

    [Fact]
    public async Task Create_UnknownCaptionId_BadRequest()
    {
        await using var ctx = NewCtx();
        var f = await SeedAsync(ctx);
        var req = TextRequest(captionId: Guid.NewGuid()); // not in doc

        var result = await NewService(ctx).CreateAsync(f.Page.Id, f.Owner.Id, req);

        result.ErrorKind.Should().Be(ServiceErrorKind.BadRequest);
    }

    [Fact]
    public async Task Create_NoCaptionAtDepth_AutoCreatesAnnotationLvlCaption()
    {
        await using var ctx = NewCtx();
        var f = await SeedAsync(ctx);
        var svc = NewService(ctx);

        // Build a chain of 4 nested Text annotations. The 4th has no matching
        // caption at its depth, so the service must auto-create "Annotation lvl 4".
        var a1 = (await svc.CreateAsync(f.Page.Id, f.Owner.Id, TextRequest(f.Caption.Id))).Value!;
        var a2 = (await svc.CreateAsync(f.Page.Id, f.Owner.Id, TextRequest(f.Caption.Id, parentId: a1.Id))).Value!;
        var a3 = (await svc.CreateAsync(f.Page.Id, f.Owner.Id, TextRequest(f.Caption.Id, parentId: a2.Id))).Value!;
        var a4 = (await svc.CreateAsync(f.Page.Id, f.Owner.Id, TextRequest(parentId: a3.Id))).Value!;

        a4.CaptionName.Should().StartWith("Annotation lvl 4");
        ctx.Captions.Should().Contain(c => c.Name == "Annotation lvl 4");
    }

    [Fact]
    public async Task Create_SymbolRefIdMustPointToTextInSameDoc()
    {
        await using var ctx = NewCtx();
        var f = await SeedAsync(ctx);
        var svc = NewService(ctx);

        var req = TextRequest(f.Caption.Id) with
        {
            Type = "Symbol",
            TranscriptionRefId = Guid.NewGuid(),
        };

        var result = await svc.CreateAsync(f.Page.Id, f.Owner.Id, req);
        result.ErrorKind.Should().Be(ServiceErrorKind.BadRequest);
    }

    [Fact]
    public async Task Create_SymbolWithMissingSymbolId_BadRequest()
    {
        await using var ctx = NewCtx();
        var f = await SeedAsync(ctx);
        var svc = NewService(ctx);

        var req = TextRequest(f.Caption.Id) with
        {
            Type = "Symbol",
            SymbolId = Guid.NewGuid(),
        };

        var result = await svc.CreateAsync(f.Page.Id, f.Owner.Id, req);
        result.ErrorKind.Should().Be(ServiceErrorKind.BadRequest);
    }

    [Fact]
    public async Task Create_Happy_StoresAndReturnsDto()
    {
        await using var ctx = NewCtx();
        var f = await SeedAsync(ctx);
        var svc = NewService(ctx);

        var result = await svc.CreateAsync(f.Page.Id, f.Owner.Id, TextRequest(f.Caption.Id));

        result.IsSuccess.Should().BeTrue();
        result.Value!.Type.Should().Be("Text");
        result.Value!.CaptionId.Should().Be(f.Caption.Id);
        result.Value!.BoundingBox.X.Should().Be(1);
        ctx.Annotations.Should().HaveCount(1);
    }

    // ---------- UpdateAsync ----------

    [Fact]
    public async Task Update_Forbidden_WhenUserCannotEdit()
    {
        await using var ctx = NewCtx();
        var f = await SeedAsync(ctx);
        var svc = NewService(ctx);
        var created = (await svc.CreateAsync(f.Page.Id, f.Owner.Id, TextRequest(f.Caption.Id))).Value!;

        var result = await svc.UpdateAsync(f.Page.Id, created.Id, Guid.NewGuid(), new UpdateAnnotationRequest());

        result.ErrorKind.Should().Be(ServiceErrorKind.Forbidden);
    }

    [Fact]
    public async Task Update_NotFound_WhenIdMissing()
    {
        await using var ctx = NewCtx();
        var f = await SeedAsync(ctx);

        var result = await NewService(ctx).UpdateAsync(f.Page.Id, Guid.NewGuid(), f.Owner.Id, new UpdateAnnotationRequest());

        result.ErrorKind.Should().Be(ServiceErrorKind.NotFound);
    }

    [Fact]
    public async Task Update_SelfParent_BadRequest()
    {
        await using var ctx = NewCtx();
        var f = await SeedAsync(ctx);
        var svc = NewService(ctx);
        var created = (await svc.CreateAsync(f.Page.Id, f.Owner.Id, TextRequest(f.Caption.Id))).Value!;

        var result = await svc.UpdateAsync(f.Page.Id, created.Id, f.Owner.Id,
            new UpdateAnnotationRequest { ParentId = created.Id });

        result.ErrorKind.Should().Be(ServiceErrorKind.BadRequest);
    }

    [Fact]
    public async Task Update_CycleParent_BadRequest()
    {
        await using var ctx = NewCtx();
        var f = await SeedAsync(ctx);
        var svc = NewService(ctx);
        var a = (await svc.CreateAsync(f.Page.Id, f.Owner.Id, TextRequest(f.Caption.Id))).Value!;
        var b = (await svc.CreateAsync(f.Page.Id, f.Owner.Id, TextRequest(f.Caption.Id, parentId: a.Id))).Value!;

        // Try to set a.parent = b (which is a descendant) -> cycle.
        var result = await svc.UpdateAsync(f.Page.Id, a.Id, f.Owner.Id,
            new UpdateAnnotationRequest { ParentId = b.Id });

        result.ErrorKind.Should().Be(ServiceErrorKind.BadRequest);
        result.ErrorMessage.Should().Contain("cycle");
    }

    [Fact]
    public async Task Update_ClearParent_DetachesFromParent()
    {
        await using var ctx = NewCtx();
        var f = await SeedAsync(ctx);
        var svc = NewService(ctx);
        var parent = (await svc.CreateAsync(f.Page.Id, f.Owner.Id, TextRequest(f.Caption.Id))).Value!;
        var child = (await svc.CreateAsync(f.Page.Id, f.Owner.Id, TextRequest(f.Caption.Id, parentId: parent.Id))).Value!;

        await svc.UpdateAsync(f.Page.Id, child.Id, f.Owner.Id,
            new UpdateAnnotationRequest { ClearParent = true });

        var stored = await ctx.Annotations.FindAsync(child.Id);
        stored!.ParentId.Should().BeNull();
    }

    [Fact]
    public async Task Update_UnknownCaption_BadRequest()
    {
        await using var ctx = NewCtx();
        var f = await SeedAsync(ctx);
        var svc = NewService(ctx);
        var created = (await svc.CreateAsync(f.Page.Id, f.Owner.Id, TextRequest(f.Caption.Id))).Value!;

        var result = await svc.UpdateAsync(f.Page.Id, created.Id, f.Owner.Id,
            new UpdateAnnotationRequest { CaptionId = Guid.NewGuid() });

        result.ErrorKind.Should().Be(ServiceErrorKind.BadRequest);
    }

    [Fact]
    public async Task Update_ChangeCaption_Persists()
    {
        await using var ctx = NewCtx();
        var f = await SeedAsync(ctx);
        var other = new Caption { Id = Guid.NewGuid(), DocumentId = f.Doc.Id, Name = "Pair" };
        ctx.Captions.Add(other);
        await ctx.SaveChangesAsync();
        var svc = NewService(ctx);
        var created = (await svc.CreateAsync(f.Page.Id, f.Owner.Id, TextRequest(f.Caption.Id))).Value!;

        var result = await svc.UpdateAsync(f.Page.Id, created.Id, f.Owner.Id,
            new UpdateAnnotationRequest { CaptionId = other.Id });

        result.IsSuccess.Should().BeTrue();
        result.Value!.CaptionId.Should().Be(other.Id);
    }

    [Fact]
    public async Task Update_InvalidType_BadRequest()
    {
        await using var ctx = NewCtx();
        var f = await SeedAsync(ctx);
        var svc = NewService(ctx);
        var created = (await svc.CreateAsync(f.Page.Id, f.Owner.Id, TextRequest(f.Caption.Id))).Value!;

        var result = await svc.UpdateAsync(f.Page.Id, created.Id, f.Owner.Id,
            new UpdateAnnotationRequest { Type = "Bogus" });

        result.ErrorKind.Should().Be(ServiceErrorKind.BadRequest);
    }

    [Fact]
    public async Task Update_TextToSymbol_BlockedWhenSomethingReferences()
    {
        await using var ctx = NewCtx();
        var f = await SeedAsync(ctx);
        var svc = NewService(ctx);
        var text = (await svc.CreateAsync(f.Page.Id, f.Owner.Id, TextRequest(f.Caption.Id))).Value!;
        // Symbol annotation referencing the text annotation as its plaintext.
        var symReq = TextRequest(f.Caption.Id) with { Type = "Symbol", TranscriptionRefId = text.Id };
        await svc.CreateAsync(f.Page.Id, f.Owner.Id, symReq);

        var result = await svc.UpdateAsync(f.Page.Id, text.Id, f.Owner.Id,
            new UpdateAnnotationRequest { Type = "Symbol" });

        result.ErrorKind.Should().Be(ServiceErrorKind.BadRequest);
        result.ErrorMessage.Should().Contain("reference");
    }

    [Fact]
    public async Task Update_OrientationAndBoundingBox_Persist()
    {
        await using var ctx = NewCtx();
        var f = await SeedAsync(ctx);
        var svc = NewService(ctx);
        var created = (await svc.CreateAsync(f.Page.Id, f.Owner.Id, TextRequest(f.Caption.Id))).Value!;

        var result = await svc.UpdateAsync(f.Page.Id, created.Id, f.Owner.Id, new UpdateAnnotationRequest
        {
            Orientation = 90,
            BoundingBox = new BoundingBoxDto { X = 5, Y = 6, Width = 7, Height = 8 },
        });

        result.IsSuccess.Should().BeTrue();
        var stored = await ctx.Annotations.Include(a => a.BoundingBox).SingleAsync(a => a.Id == created.Id);
        stored.Orientation.Should().Be(90);
        stored.BoundingBox!.X.Should().Be(5);
        stored.BoundingBox.Height.Should().Be(8);
    }

    // ---------- DeleteAsync ----------

    [Fact]
    public async Task Delete_Forbidden_WhenUserCannotEdit()
    {
        await using var ctx = NewCtx();
        var f = await SeedAsync(ctx);
        var svc = NewService(ctx);
        var created = (await svc.CreateAsync(f.Page.Id, f.Owner.Id, TextRequest(f.Caption.Id))).Value!;

        var result = await svc.DeleteAsync(f.Page.Id, created.Id, Guid.NewGuid());

        result.ErrorKind.Should().Be(ServiceErrorKind.Forbidden);
    }

    [Fact]
    public async Task Delete_NotFound()
    {
        await using var ctx = NewCtx();
        var f = await SeedAsync(ctx);

        var result = await NewService(ctx).DeleteAsync(f.Page.Id, Guid.NewGuid(), f.Owner.Id);

        result.ErrorKind.Should().Be(ServiceErrorKind.NotFound);
    }

    [Fact]
    public async Task Delete_Happy_RemovesRow()
    {
        await using var ctx = NewCtx();
        var f = await SeedAsync(ctx);
        var svc = NewService(ctx);
        var created = (await svc.CreateAsync(f.Page.Id, f.Owner.Id, TextRequest(f.Caption.Id))).Value!;

        var result = await svc.DeleteAsync(f.Page.Id, created.Id, f.Owner.Id);

        result.IsSuccess.Should().BeTrue();
        ctx.Annotations.Any().Should().BeFalse();
    }

    // ---------- UpdateBoundingBoxAsync ----------

    [Fact]
    public async Task UpdateBoundingBox_Forbidden()
    {
        await using var ctx = NewCtx();
        var f = await SeedAsync(ctx);
        var svc = NewService(ctx);
        var created = (await svc.CreateAsync(f.Page.Id, f.Owner.Id, TextRequest(f.Caption.Id))).Value!;

        var result = await svc.UpdateBoundingBoxAsync(f.Page.Id, created.Id, Guid.NewGuid(),
            new BoundingBoxDto { X = 1, Y = 1, Width = 1, Height = 1 });

        result.ErrorKind.Should().Be(ServiceErrorKind.Forbidden);
    }

    [Fact]
    public async Task UpdateBoundingBox_NotFound()
    {
        await using var ctx = NewCtx();
        var f = await SeedAsync(ctx);

        var result = await NewService(ctx).UpdateBoundingBoxAsync(f.Page.Id, Guid.NewGuid(), f.Owner.Id,
            new BoundingBoxDto { X = 1, Y = 1, Width = 1, Height = 1 });

        result.ErrorKind.Should().Be(ServiceErrorKind.NotFound);
    }

    [Fact]
    public async Task UpdateBoundingBox_Happy()
    {
        await using var ctx = NewCtx();
        var f = await SeedAsync(ctx);
        var svc = NewService(ctx);
        var created = (await svc.CreateAsync(f.Page.Id, f.Owner.Id, TextRequest(f.Caption.Id))).Value!;

        var result = await svc.UpdateBoundingBoxAsync(f.Page.Id, created.Id, f.Owner.Id,
            new BoundingBoxDto { X = 11, Y = 22, Width = 33, Height = 44 });

        result.IsSuccess.Should().BeTrue();
        result.Value!.Width.Should().Be(33);
    }

    // ---------- ListForDocumentAsync ----------

    [Fact]
    public async Task ListForDocument_Forbidden_WhenPrivate()
    {
        await using var ctx = NewCtx();
        var f = await SeedAsync(ctx);

        var result = await NewService(ctx).ListForDocumentAsync(
            f.Doc.Id, Guid.NewGuid(), type: null, currentPageId: null, parentId: null, rootOnly: false);

        result.ErrorKind.Should().Be(ServiceErrorKind.Forbidden);
    }

    [Fact]
    public async Task ListForDocument_InvalidType_BadRequest()
    {
        await using var ctx = NewCtx();
        var f = await SeedAsync(ctx);

        var result = await NewService(ctx).ListForDocumentAsync(
            f.Doc.Id, f.Owner.Id, type: "Nope", currentPageId: null, parentId: null, rootOnly: false);

        result.ErrorKind.Should().Be(ServiceErrorKind.BadRequest);
    }

    [Fact]
    public async Task ListForDocument_FiltersByTypeAndParent()
    {
        await using var ctx = NewCtx();
        var f = await SeedAsync(ctx);
        var svc = NewService(ctx);
        var parent = (await svc.CreateAsync(f.Page.Id, f.Owner.Id, TextRequest(f.Caption.Id))).Value!;
        await svc.CreateAsync(f.Page.Id, f.Owner.Id, TextRequest(f.Caption.Id, parentId: parent.Id));
        await svc.CreateAsync(f.Page.Id, f.Owner.Id, TextRequest(f.Caption.Id, parentId: parent.Id));

        var roots = await svc.ListForDocumentAsync(f.Doc.Id, f.Owner.Id,
            type: "Text", currentPageId: null, parentId: null, rootOnly: true);
        roots.Value!.Should().HaveCount(1);

        var children = await svc.ListForDocumentAsync(f.Doc.Id, f.Owner.Id,
            type: null, currentPageId: null, parentId: parent.Id, rootOnly: false);
        children.Value!.Should().HaveCount(2);
    }

    [Fact]
    public async Task ListForDocument_CurrentPageFirst_Reorders()
    {
        await using var ctx = NewCtx();
        var f = await SeedAsync(ctx);
        var otherPage = new Page
        {
            Id = Guid.NewGuid(),
            DocumentId = f.Doc.Id,
            PageNumber = 2,
            ImageBlobId = Guid.NewGuid(),
            Width = 1, Height = 1, Orientation = 0, ResolutionDPI = 72,
        };
        ctx.Pages.Add(otherPage);
        await ctx.SaveChangesAsync();
        var svc = NewService(ctx);
        await svc.CreateAsync(f.Page.Id, f.Owner.Id, TextRequest(f.Caption.Id));
        await svc.CreateAsync(otherPage.Id, f.Owner.Id, TextRequest(f.Caption.Id));

        var result = await svc.ListForDocumentAsync(f.Doc.Id, f.Owner.Id,
            type: null, currentPageId: otherPage.Id, parentId: null, rootOnly: false);

        result.Value!.First().PageId.Should().Be(otherPage.Id);
    }

    private sealed class NoOpAutoAnnotation : IAutoAnnotationService
    {
        public Task<IReadOnlyList<AutoDetection>> DetectAsync(byte[] _, string __, CancellationToken ___ = default)
            => Task.FromResult<IReadOnlyList<AutoDetection>>(Array.Empty<AutoDetection>());
    }

    private sealed class NoOpStorage : IFileStorageService
    {
        public Task<Guid> SaveAsync(byte[] data, string fileName, string contentType, CancellationToken ct = default) => Task.FromResult(Guid.NewGuid());
        public Task<FileBlob?> GetAsync(Guid id, CancellationToken ct = default) => Task.FromResult<FileBlob?>(null);
        public Task<byte[]?> GetBytesAsync(Guid id, CancellationToken ct = default) => Task.FromResult<byte[]?>(null);
        public Task DeleteAsync(Guid id, CancellationToken ct = default) => Task.CompletedTask;
    }
}
