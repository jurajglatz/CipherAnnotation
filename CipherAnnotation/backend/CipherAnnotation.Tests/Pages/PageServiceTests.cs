using CipherAnnotation.Core.Common;
using CipherAnnotation.Core.DTOs.Page;
using CipherAnnotation.Core.Interfaces;
using CipherAnnotation.Infrastructure.Services.Pages;
using Microsoft.Extensions.Logging.Abstractions;

namespace CipherAnnotation.Tests.Pages;

public class PageServiceTests
{
    private static AppDbContext NewCtx() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static (PageService svc, AppDbContext ctx, FakeImage img, FakeStorage storage) NewService()
    {
        var ctx = NewCtx();
        var img = new FakeImage();
        var storage = new FakeStorage();
        var svc = new PageService(
            img,
            storage,
            ctx,
            NullLogger<PageService>.Instance);
        return (svc, ctx, img, storage);
    }

    private static (User owner, Document doc, Page page) SeedDocWithPage(AppDbContext ctx)
    {
        var owner = new User { Id = Guid.NewGuid(), Email = "owner@example.com", Name = "Owner" };
        ctx.Users.Add(owner);
        var doc = new Document
        {
            Id = Guid.NewGuid(),
            Title = "Doc",
            OwnerId = owner.Id,
            Visibility = Visibility.Private,
        };
        ctx.Documents.Add(doc);
        var page = new Page
        {
            Id = Guid.NewGuid(),
            DocumentId = doc.Id,
            PageNumber = 1,
            ImageBlobId = Guid.NewGuid(),
            Width = 100, Height = 100, Orientation = 0, ResolutionDPI = 72,
        };
        ctx.Pages.Add(page);
        ctx.SaveChanges();
        return (owner, doc, page);
    }

    [Fact]
    public async Task GetDocumentPagesAsync_OwnerGetsPages()
    {
        var (svc, ctx, _, _) = NewService();
        var (owner, doc, _) = SeedDocWithPage(ctx);

        var result = await svc.GetDocumentPagesAsync(doc.Id, owner.Id);

        result.IsSuccess.Should().BeTrue();
        result.Value!.Should().HaveCount(1);
    }

    [Fact]
    public async Task GetDocumentPagesAsync_NonOwnerPrivate_Forbidden()
    {
        var (svc, ctx, _, _) = NewService();
        var (_, doc, _) = SeedDocWithPage(ctx);

        var result = await svc.GetDocumentPagesAsync(doc.Id, Guid.NewGuid());

        result.ErrorKind.Should().Be(ServiceErrorKind.Forbidden);
    }

    [Fact]
    public async Task GetPageImageAsync_ReturnsBlobContent()
    {
        var (svc, ctx, _, storage) = NewService();
        var (owner, doc, page) = SeedDocWithPage(ctx);
        storage.Blobs[page.ImageBlobId] = new FileBlob
        {
            Id = page.ImageBlobId,
            Data = new byte[] { 1, 2, 3 },
            ContentType = "image/png",
            FileName = "x.png",
            Sha256 = "abc",
        };

        var result = await svc.GetPageImageAsync(doc.Id, page.Id, owner.Id);

        result.IsSuccess.Should().BeTrue();
        result.Value!.ContentType.Should().Be("image/png");
        result.Value.Sha256.Should().Be("abc");
    }

    [Fact]
    public async Task PreprocessPageAsync_AppliesAndCreatesHistory()
    {
        var (svc, ctx, img, storage) = NewService();
        var (owner, doc, page) = SeedDocWithPage(ctx);
        storage.Blobs[page.ImageBlobId] = new FileBlob
        {
            Id = page.ImageBlobId,
            Data = MakeTinyPng(),
            ContentType = "image/png",
            FileName = "x.png",
            Sha256 = "src",
        };

        var result = await svc.PreprocessPageAsync(doc.Id, page.Id, owner.Id,
            new[] { new PreprocessOperation { Name = "grayscale" } });

        result.IsSuccess.Should().BeTrue();
        result.Value!.CurrentPreprocessHistoryId.Should().NotBeNull();
        ctx.PreprocessHistoryEntries.Count(e => e.PageId == page.Id).Should().Be(1);
        img.GrayscaleCalls.Should().Be(1);
    }

    [Fact]
    public async Task PreprocessPageAsync_UnknownOp_BadRequest()
    {
        var (svc, ctx, _, storage) = NewService();
        var (owner, doc, page) = SeedDocWithPage(ctx);
        storage.Blobs[page.ImageBlobId] = new FileBlob
        {
            Id = page.ImageBlobId,
            Data = MakeTinyPng(),
            ContentType = "image/png",
            FileName = "x.png",
            Sha256 = "src",
        };

        var result = await svc.PreprocessPageAsync(doc.Id, page.Id, owner.Id,
            new[] { new PreprocessOperation { Name = "nonsense" } });

        result.ErrorKind.Should().Be(ServiceErrorKind.BadRequest);
    }

    [Fact]
    public async Task UndoPreprocessAsync_NothingToUndo_BadRequest()
    {
        var (svc, ctx, _, _) = NewService();
        var (owner, doc, page) = SeedDocWithPage(ctx);

        var result = await svc.UndoPreprocessAsync(doc.Id, page.Id, owner.Id);

        result.ErrorKind.Should().Be(ServiceErrorKind.BadRequest);
    }

    [Fact]
    public async Task UndoThenRedo_RestoresState()
    {
        var (svc, ctx, _, storage) = NewService();
        var (owner, doc, page) = SeedDocWithPage(ctx);
        storage.Blobs[page.ImageBlobId] = new FileBlob
        {
            Id = page.ImageBlobId,
            Data = MakeTinyPng(),
            ContentType = "image/png",
            FileName = "x.png",
            Sha256 = "src",
        };

        await svc.PreprocessPageAsync(doc.Id, page.Id, owner.Id,
            new[] { new PreprocessOperation { Name = "grayscale" } });

        var undo = await svc.UndoPreprocessAsync(doc.Id, page.Id, owner.Id);
        undo.IsSuccess.Should().BeTrue();
        undo.Value!.Page.CurrentPreprocessHistoryId.Should().BeNull();
        undo.Value.CanRedo.Should().BeTrue();

        var redo = await svc.RedoPreprocessAsync(doc.Id, page.Id, owner.Id);
        redo.IsSuccess.Should().BeTrue();
        redo.Value!.Page.CurrentPreprocessHistoryId.Should().NotBeNull();
    }

    [Fact]
    public async Task ResetPreprocessingAsync_ClearsHistory()
    {
        var (svc, ctx, _, storage) = NewService();
        var (owner, doc, page) = SeedDocWithPage(ctx);
        storage.Blobs[page.ImageBlobId] = new FileBlob
        {
            Id = page.ImageBlobId,
            Data = MakeTinyPng(),
            ContentType = "image/png",
            FileName = "x.png",
            Sha256 = "src",
        };

        await svc.PreprocessPageAsync(doc.Id, page.Id, owner.Id,
            new[] { new PreprocessOperation { Name = "grayscale" } });

        var result = await svc.ResetPreprocessingAsync(doc.Id, page.Id, owner.Id);

        result.IsSuccess.Should().BeTrue();
        ctx.PreprocessHistoryEntries.Count(e => e.PageId == page.Id).Should().Be(0);
        var reloaded = await ctx.Pages.FindAsync(page.Id);
        reloaded!.ProcessedImageBlobId.Should().BeNull();
        reloaded.CurrentPreprocessHistoryId.Should().BeNull();
    }

    [Fact]
    public async Task ApplyPreprocessToAllAsync_AppliesEveryPage()
    {
        var (svc, ctx, _, storage) = NewService();
        var (owner, doc, page) = SeedDocWithPage(ctx);
        var page2 = new Page
        {
            Id = Guid.NewGuid(),
            DocumentId = doc.Id,
            PageNumber = 2,
            ImageBlobId = Guid.NewGuid(),
            Width = 10, Height = 10, Orientation = 0, ResolutionDPI = 72,
        };
        ctx.Pages.Add(page2);
        ctx.SaveChanges();
        storage.Blobs[page.ImageBlobId] = new FileBlob
        { Id = page.ImageBlobId, Data = MakeTinyPng(), ContentType = "image/png", FileName = "a.png", Sha256 = "a" };
        storage.Blobs[page2.ImageBlobId] = new FileBlob
        { Id = page2.ImageBlobId, Data = MakeTinyPng(), ContentType = "image/png", FileName = "b.png", Sha256 = "b" };

        var result = await svc.ApplyPreprocessToAllAsync(doc.Id, owner.Id,
            new[] { new PreprocessOperation { Name = "grayscale" } });

        result.IsSuccess.Should().BeTrue();
        result.Value!.AppliedCount.Should().Be(2);
        result.Value.FailedCount.Should().Be(0);
    }

    private static byte[] MakeTinyPng()
    {
        using var img = new SixLabors.ImageSharp.Image<SixLabors.ImageSharp.PixelFormats.Rgba32>(2, 2);
        using var ms = new MemoryStream();
        SixLabors.ImageSharp.ImageExtensions.SaveAsPng(img, ms);
        return ms.ToArray();
    }

    private sealed class FakeStorage : IFileStorageService
    {
        public Dictionary<Guid, FileBlob> Blobs { get; } = new();

        public Task<Guid> SaveAsync(byte[] data, string fileName, string contentType, CancellationToken ct = default)
        {
            var id = Guid.NewGuid();
            Blobs[id] = new FileBlob
            {
                Id = id, Data = data, ContentType = contentType, FileName = fileName, Sha256 = id.ToString("N"),
            };
            return Task.FromResult(id);
        }

        public Task<FileBlob?> GetAsync(Guid id, CancellationToken ct = default) =>
            Task.FromResult(Blobs.TryGetValue(id, out var b) ? b : null);

        public Task<byte[]?> GetBytesAsync(Guid id, CancellationToken ct = default) =>
            Task.FromResult(Blobs.TryGetValue(id, out var b) ? b.Data : null);

        public Task DeleteAsync(Guid id, CancellationToken ct = default)
        {
            Blobs.Remove(id);
            return Task.CompletedTask;
        }
    }

    private sealed class FakeImage : IImageProcessingService
    {
        public int GrayscaleCalls { get; private set; }

        public Task<byte[]> BinarizeAsync(byte[] data, CancellationToken ct = default) => Task.FromResult(data);
        public Task<byte[]> ThresholdAsync(byte[] data, float threshold, CancellationToken ct = default) => Task.FromResult(data);
        public Task<byte[]> AdjustContrastAsync(byte[] data, float amount, CancellationToken ct = default) => Task.FromResult(data);
        public Task<byte[]> DeskewAsync(byte[] data, CancellationToken ct = default) => Task.FromResult(data);
        public Task<byte[]> RotateAsync(byte[] data, float degrees, CancellationToken ct = default) => Task.FromResult(data);
        public Task<byte[]> RemoveNoiseAsync(byte[] data, CancellationToken ct = default) => Task.FromResult(data);
        public Task<byte[]> ScaleAsync(byte[] data, float factor, CancellationToken ct = default) => Task.FromResult(data);
        public Task<byte[]> GrayscaleAsync(byte[] data, CancellationToken ct = default)
        {
            GrayscaleCalls++;
            return Task.FromResult(data);
        }
    }
}
