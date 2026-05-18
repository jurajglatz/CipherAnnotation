using CipherAnnotation.Core.Common;
using CipherAnnotation.Core.Interfaces;
using CipherAnnotation.Infrastructure.Services.Symbols;

namespace CipherAnnotation.Tests.Symbols;

public class SymbolServiceTests
{
    private static AppDbContext NewCtx() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static (SymbolService svc, AppDbContext ctx) NewService()
    {
        var ctx = NewCtx();
        var svc = new SymbolService(ctx, new FakeStorage(), new NullVlmSuggestionService(), new NullAppSettingsService());
        return (svc, ctx);
    }

    private static User SeedUser(AppDbContext ctx, string email = "owner@example.com")
    {
        var u = new User { Id = Guid.NewGuid(), Email = email, Name = email };
        ctx.Users.Add(u);
        ctx.SaveChanges();
        return u;
    }

    private static (Document doc, Page page, Caption cap) SeedDoc(
        AppDbContext ctx, Guid ownerId, Visibility vis = Visibility.Private)
    {
        var doc = new Document { Id = Guid.NewGuid(), Title = "Doc", OwnerId = ownerId, Visibility = vis };
        var page = new Page
        {
            Id = Guid.NewGuid(),
            DocumentId = doc.Id,
            PageNumber = 1,
            ImageBlobId = Guid.NewGuid(),
            Width = 100,
            Height = 100,
            Orientation = 0,
            ResolutionDPI = 72,
        };
        var cap = new Caption { Id = Guid.NewGuid(), DocumentId = doc.Id, Name = "Sec" };
        ctx.AddRange(doc, page, cap);
        ctx.SaveChanges();
        return (doc, page, cap);
    }

    private static Symbol SeedSymbol(AppDbContext ctx, Guid ownerId, string? content = null)
    {
        var sym = new Symbol
        {
            Id = Guid.NewGuid(),
            OwnerUserId = ownerId,
            Content = content,
            ImageBlobId = Guid.NewGuid(),
            CreatedAt = DateTime.UtcNow,
        };
        ctx.Symbols.Add(sym);
        ctx.SaveChanges();
        return sym;
    }

    private static Annotation SeedSymbolAnnotation(
        AppDbContext ctx, Page page, Caption cap, Guid symbolId)
    {
        var ann = new Annotation
        {
            Id = Guid.NewGuid(),
            PageId = page.Id,
            CaptionId = cap.Id,
            Type = AnnotationType.Symbol,
            Orientation = 0,
            SymbolId = symbolId,
            BoundingBox = new BoundingBox { X = 0, Y = 0, Width = 10, Height = 10 },
        };
        ctx.Annotations.Add(ann);
        ctx.SaveChanges();
        return ann;
    }

    [Fact]
    public async Task CreateAsync_PersistsSymbolForOwner()
    {
        var (svc, ctx) = NewService();
        var owner = SeedUser(ctx);

        var result = await svc.CreateAsync(owner.Id, "A", new byte[] { 0x89, 0x50 }, "a.png");

        result.IsSuccess.Should().BeTrue();
        result.Value!.OwnerUserId.Should().Be(owner.Id);
        result.Value.Content.Should().Be("A");
        result.Value.ImageUrl.Should().Contain(result.Value.Id.ToString());
        ctx.Symbols.Count().Should().Be(1);
    }

    [Fact]
    public async Task CreateAsync_RejectsEmptyPng()
    {
        var (svc, ctx) = NewService();
        var owner = SeedUser(ctx);

        var result = await svc.CreateAsync(owner.Id, null, Array.Empty<byte>(), "a.png");

        result.ErrorKind.Should().Be(ServiceErrorKind.BadRequest);
    }

    [Fact]
    public async Task UpdateAsync_OnlyOwnerCanEditContent()
    {
        var (svc, ctx) = NewService();
        var owner = SeedUser(ctx);
        var other = SeedUser(ctx, "x@x");
        var sym = SeedSymbol(ctx, owner.Id, "A");

        var ok = await svc.UpdateAsync(sym.Id, owner.Id, "B");
        ok.IsSuccess.Should().BeTrue();
        ok.Value!.Content.Should().Be("B");

        var forbidden = await svc.UpdateAsync(sym.Id, other.Id, "C");
        forbidden.ErrorKind.Should().Be(ServiceErrorKind.Forbidden);
    }

    [Fact]
    public async Task DeleteAsync_OnlyOwnerCanDelete()
    {
        var (svc, ctx) = NewService();
        var owner = SeedUser(ctx);
        var other = SeedUser(ctx, "x@x");
        var sym = SeedSymbol(ctx, owner.Id);

        (await svc.DeleteAsync(sym.Id, other.Id)).ErrorKind.Should().Be(ServiceErrorKind.Forbidden);
        (await svc.DeleteAsync(sym.Id, owner.Id)).IsSuccess.Should().BeTrue();
        ctx.Symbols.Count().Should().Be(0);
    }

    [Fact]
    public async Task ListAsync_MineScope_ReturnsOnlyUserOwnedSymbols()
    {
        var (svc, ctx) = NewService();
        var owner = SeedUser(ctx);
        var other = SeedUser(ctx, "x@x");
        SeedSymbol(ctx, owner.Id, "mine");
        SeedSymbol(ctx, other.Id, "theirs");

        var result = await svc.ListAsync(owner.Id, "mine", null, 50, 0);

        result.IsSuccess.Should().BeTrue();
        result.Value!.Should().HaveCount(1).And.OnlyContain(s => s.Content == "mine");
    }

    [Fact]
    public async Task ListAsync_PublicScope_ReturnsSymbolsUsedInPublicDocs()
    {
        var (svc, ctx) = NewService();
        var owner = SeedUser(ctx);
        var viewer = SeedUser(ctx, "v@v");
        var (_, page, cap) = SeedDoc(ctx, owner.Id, Visibility.Public);
        var symUsed = SeedSymbol(ctx, owner.Id, "used");
        SeedSymbol(ctx, owner.Id, "unused");
        SeedSymbolAnnotation(ctx, page, cap, symUsed.Id);

        var result = await svc.ListAsync(viewer.Id, "public", null, 50, 0);

        result.IsSuccess.Should().BeTrue();
        result.Value!.Should().HaveCount(1).And.OnlyContain(s => s.Content == "used");
    }

    [Fact]
    public async Task GetByIdAsync_HiddenFromUnrelatedUser()
    {
        var (svc, ctx) = NewService();
        var owner = SeedUser(ctx);
        var other = SeedUser(ctx, "x@x");
        var sym = SeedSymbol(ctx, owner.Id);

        var result = await svc.GetByIdAsync(sym.Id, other.Id);
        result.ErrorKind.Should().Be(ServiceErrorKind.NotFound);
    }

    [Fact]
    public async Task GetOccurrencesAsync_FiltersByVisibility()
    {
        var (svc, ctx) = NewService();
        var owner = SeedUser(ctx);
        var viewer = SeedUser(ctx, "v@v");
        var (_, pagePriv, capPriv) = SeedDoc(ctx, owner.Id, Visibility.Private);
        var (_, pagePub, capPub) = SeedDoc(ctx, owner.Id, Visibility.Public);
        var sym = SeedSymbol(ctx, owner.Id);
        SeedSymbolAnnotation(ctx, pagePriv, capPriv, sym.Id);
        SeedSymbolAnnotation(ctx, pagePub, capPub, sym.Id);

        var asOwner = await svc.GetOccurrencesAsync(sym.Id, owner.Id, 100, 0);
        asOwner.Value!.Count().Should().Be(2);

        var asViewer = await svc.GetOccurrencesAsync(sym.Id, viewer.Id, 100, 0);
        asViewer.Value!.Count().Should().Be(1); // only the public-doc occurrence
    }

    [Fact]
    public async Task RecognizeAsync_StubReturnsNullContent()
    {
        var (svc, ctx) = NewService();
        var owner = SeedUser(ctx);
        var sym = SeedSymbol(ctx, owner.Id);

        var result = await svc.RecognizeAsync(sym.Id, owner.Id);

        result.IsSuccess.Should().BeTrue();
        result.Value!.Content.Should().BeNull();
        result.Value.Confidence.Should().Be(0f);
    }

    private sealed class FakeStorage : IFileStorageService
    {
        public Task<Guid> SaveAsync(byte[] data, string fileName, string contentType, CancellationToken ct = default)
            => Task.FromResult(Guid.NewGuid());
        public Task<FileBlob?> GetAsync(Guid id, CancellationToken ct = default) => Task.FromResult<FileBlob?>(null);
        public Task<byte[]?> GetBytesAsync(Guid id, CancellationToken ct = default) => Task.FromResult<byte[]?>(null);
        public Task DeleteAsync(Guid id, CancellationToken ct = default) => Task.CompletedTask;
    }

    private sealed class NullVlmSuggestionService : IVlmSuggestionService
    {
        public Task<string?> SuggestSymbolContentAsync(byte[] imageBytes, string mimeType, CancellationToken ct = default)
            => Task.FromResult<string?>(null);
    }

    private sealed class NullAppSettingsService : IAppSettingsService
    {
        public Task<bool> GetBoolAsync(string key, bool defaultValue = false, CancellationToken ct = default)
            => Task.FromResult(defaultValue);
        public Task<IReadOnlyDictionary<string, string>> GetAllAsync(CancellationToken ct = default)
            => Task.FromResult<IReadOnlyDictionary<string, string>>(new Dictionary<string, string>());
        public Task SetAsync(string key, string value, Guid? updatedByUserId = null, CancellationToken ct = default)
            => Task.CompletedTask;
    }
}
