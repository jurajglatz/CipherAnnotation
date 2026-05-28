using CipherAnnotation.Infrastructure.Services.Storage;

namespace CipherAnnotation.Tests.Storage;

public class FileStorageServiceTests
{
    private static AppDbContext NewCtx() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    [Fact]
    public async Task SaveThenGetBytes_RoundTripsContent()
    {
        var ctx = NewCtx();
        var svc = new FileStorageService(ctx);
        var payload = new byte[] { 1, 2, 3, 4, 5 };

        var id = await svc.SaveAsync(payload, "f.bin", "application/octet-stream");
        await ctx.SaveChangesAsync();

        var bytes = await svc.GetBytesAsync(id);
        bytes.Should().Equal(payload);
    }

    [Fact]
    public async Task GetAsync_ReturnsFullBlobMetadata()
    {
        var ctx = NewCtx();
        var svc = new FileStorageService(ctx);
        var payload = new byte[] { 9, 9, 9 };

        var id = await svc.SaveAsync(payload, "p.png", "image/png");
        await ctx.SaveChangesAsync();

        var blob = await svc.GetAsync(id);
        blob.Should().NotBeNull();
        blob!.SizeBytes.Should().Be(payload.LongLength);
        blob.Sha256.Should().NotBeNullOrWhiteSpace();
        blob.ContentType.Should().Be("image/png");
        blob.FileName.Should().Be("p.png");
    }

    [Fact]
    public async Task GetBytesAsync_UnknownId_ReturnsNull()
    {
        var ctx = NewCtx();
        var svc = new FileStorageService(ctx);

        (await svc.GetBytesAsync(Guid.NewGuid())).Should().BeNull();
    }

    [Fact]
    public async Task DeleteAsync_RemovesBlob()
    {
        var ctx = NewCtx();
        var svc = new FileStorageService(ctx);
        var id = await svc.SaveAsync(new byte[] { 1 }, "x", "x");
        await ctx.SaveChangesAsync();

        await svc.DeleteAsync(id);

        (await svc.GetBytesAsync(id)).Should().BeNull();
    }

    [Fact]
    public async Task DeleteAsync_UnknownId_DoesNotThrow()
    {
        var ctx = NewCtx();
        var svc = new FileStorageService(ctx);

        var act = async () => await svc.DeleteAsync(Guid.NewGuid());

        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task SaveAsync_EmptyFileNameAndContentType_FallsBackToDefaults()
    {
        var ctx = NewCtx();
        var svc = new FileStorageService(ctx);

        var id = await svc.SaveAsync(new byte[] { 0 }, "", "");
        await ctx.SaveChangesAsync();

        var blob = await svc.GetAsync(id);
        blob!.FileName.Should().Be("file");
        blob.ContentType.Should().Be("application/octet-stream");
    }
}
