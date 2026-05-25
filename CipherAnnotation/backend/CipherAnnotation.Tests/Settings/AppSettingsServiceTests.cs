using CipherAnnotation.Core.Interfaces;
using CipherAnnotation.Infrastructure.Services.Settings;
using Microsoft.Extensions.Caching.Memory;

namespace CipherAnnotation.Tests.Settings;

public class AppSettingsServiceTests
{
    private static AppDbContext NewCtx() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static (AppSettingsService svc, AppDbContext ctx, IMemoryCache cache) NewService()
    {
        var ctx = NewCtx();
        var cache = new MemoryCache(new MemoryCacheOptions());
        return (new AppSettingsService(ctx, cache), ctx, cache);
    }

    [Fact]
    public async Task SetAsync_ThenGetAllAsync_ReturnsValue()
    {
        var (svc, _, _) = NewService();

        await svc.SetAsync("feature.x", "hello");
        var all = await svc.GetAllAsync();

        all.Should().ContainKey("feature.x").WhoseValue.Should().Be("hello");
    }

    [Fact]
    public async Task SetAsync_UpdatesExistingKeyInPlace()
    {
        var (svc, ctx, _) = NewService();

        await svc.SetAsync("feature.x", "v1");
        await svc.SetAsync("feature.x", "v2");

        var rows = await ctx.AppSettings.Where(s => s.Key == "feature.x").ToListAsync();
        rows.Should().HaveCount(1);
        rows[0].Value.Should().Be("v2");
    }

    [Fact]
    public async Task GetBoolAsync_ReturnsParsedTrue()
    {
        var (svc, _, _) = NewService();
        await svc.SetAsync("flag", "true");

        (await svc.GetBoolAsync("flag")).Should().BeTrue();
    }

    [Fact]
    public async Task GetBoolAsync_MissingKey_ReturnsDefault()
    {
        var (svc, _, _) = NewService();

        (await svc.GetBoolAsync("missing", defaultValue: true)).Should().BeTrue();
        (await svc.GetBoolAsync("missing", defaultValue: false)).Should().BeFalse();
    }

    [Fact]
    public async Task GetBoolAsync_NonBooleanValue_ReturnsDefault()
    {
        var (svc, _, _) = NewService();
        await svc.SetAsync("flag", "not-a-bool");

        (await svc.GetBoolAsync("flag", defaultValue: true)).Should().BeTrue();
    }

    [Fact]
    public async Task GetAllAsync_CachesResult_BypassingDbWrite()
    {
        var (svc, ctx, _) = NewService();
        var first = await svc.GetAllAsync();
        first.Should().BeEmpty();

        ctx.AppSettings.Add(new AppSetting
        {
            Key = "cached.away", Value = "v", UpdatedAt = DateTime.UtcNow,
        });
        await ctx.SaveChangesAsync();

        var second = await svc.GetAllAsync();
        second.Should().BeEmpty();
    }

    [Fact]
    public async Task SetAsync_InvalidatesCache()
    {
        var (svc, _, _) = NewService();
        (await svc.GetAllAsync()).Should().BeEmpty();

        await svc.SetAsync("new.key", "new.val");

        var refreshed = await svc.GetAllAsync();
        refreshed.Should().ContainKey("new.key").WhoseValue.Should().Be("new.val");
    }
}
