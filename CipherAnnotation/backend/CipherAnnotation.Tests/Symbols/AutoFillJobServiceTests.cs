using CipherAnnotation.Core.DTOs.Symbol;
using CipherAnnotation.Core.Interfaces;
using CipherAnnotation.Infrastructure.Services.Symbols;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

namespace CipherAnnotation.Tests.Symbols;

public class AutoFillJobServiceTests
{
    private static AppDbContext NewCtx(string name) =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(name)
            .Options);

    private static (AutoFillJobService svc, AppDbContext seedCtx, FakeSettings settings) NewService(bool featureEnabled)
    {
        var dbName = Guid.NewGuid().ToString();
        var seedCtx = NewCtx(dbName);

        var settings = new FakeSettings { Enabled = featureEnabled };

        var services = new ServiceCollection();
        services.AddDbContext<AppDbContext>(o => o.UseInMemoryDatabase(dbName));
        services.AddSingleton<IAppSettingsService>(settings);
        var provider = services.BuildServiceProvider();
        var scopeFactory = provider.GetRequiredService<IServiceScopeFactory>();

        var svc = new AutoFillJobService(scopeFactory, NullLogger<AutoFillJobService>.Instance);
        return (svc, seedCtx, settings);
    }

    private static User SeedUser(AppDbContext ctx)
    {
        var u = new User { Id = Guid.NewGuid(), Email = "u@example.com", Name = "u" };
        ctx.Users.Add(u);
        ctx.SaveChanges();
        return u;
    }

    private static (Document doc, Page page) SeedDocWithEmptyPage(AppDbContext ctx, Guid ownerId)
    {
        var doc = new Document { Id = Guid.NewGuid(), Title = "D", OwnerId = ownerId };
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
        ctx.AddRange(doc, page);
        ctx.SaveChanges();
        return (doc, page);
    }

    [Fact]
    public async Task StartAsync_EmptyUserId_ReturnsUnauthorized()
    {
        var (svc, _, _) = NewService(featureEnabled: true);

        var result = await svc.StartAsync(AutoFillScope.Page, Guid.NewGuid(), Guid.Empty);

        result.IsSuccess.Should().BeFalse();
        result.ErrorKind.Should().Be(Core.Common.ServiceErrorKind.Unauthorized);
    }

    [Fact]
    public async Task StartAsync_FeatureFlagOff_ReturnsForbidden()
    {
        var (svc, ctx, _) = NewService(featureEnabled: false);
        var user = SeedUser(ctx);
        var (_, page) = SeedDocWithEmptyPage(ctx, user.Id);

        var result = await svc.StartAsync(AutoFillScope.Page, page.Id, user.Id);

        result.ErrorKind.Should().Be(Core.Common.ServiceErrorKind.Forbidden);
    }

    [Fact]
    public async Task StartAsync_NotOwner_NotShared_ReturnsForbidden()
    {
        var (svc, ctx, _) = NewService(featureEnabled: true);
        var owner = SeedUser(ctx);
        var (_, page) = SeedDocWithEmptyPage(ctx, owner.Id);
        var other = new User { Id = Guid.NewGuid(), Email = "o@example.com", Name = "o" };
        ctx.Users.Add(other);
        await ctx.SaveChangesAsync();

        var result = await svc.StartAsync(AutoFillScope.Page, page.Id, other.Id);

        result.ErrorKind.Should().Be(Core.Common.ServiceErrorKind.Forbidden);
    }

    [Fact]
    public async Task StartAsync_OwnerWithNoCandidatePages_CompletesImmediately()
    {
        var (svc, ctx, _) = NewService(featureEnabled: true);
        var owner = SeedUser(ctx);
        var (_, page) = SeedDocWithEmptyPage(ctx, owner.Id);

        var result = await svc.StartAsync(AutoFillScope.Page, page.Id, owner.Id);

        result.IsSuccess.Should().BeTrue();
        result.Value!.JobId.Should().NotBe(Guid.Empty);

        var list = svc.List(owner.Id);
        list.IsSuccess.Should().BeTrue();
        list.Value!.Should().ContainSingle()
            .Which.Status.Should().Be(AutoFillJobStatus.Completed);
    }

    [Fact]
    public void List_EmptyUserId_ReturnsUnauthorized()
    {
        var (svc, _, _) = NewService(featureEnabled: true);

        var result = svc.List(Guid.Empty);

        result.ErrorKind.Should().Be(Core.Common.ServiceErrorKind.Unauthorized);
    }

    [Fact]
    public async Task List_ReturnsOnlyCallerJobs()
    {
        var (svc, ctx, _) = NewService(featureEnabled: true);
        var owner = SeedUser(ctx);
        var (_, page) = SeedDocWithEmptyPage(ctx, owner.Id);
        await svc.StartAsync(AutoFillScope.Page, page.Id, owner.Id);

        var otherId = Guid.NewGuid();
        var otherList = svc.List(otherId);

        otherList.IsSuccess.Should().BeTrue();
        otherList.Value!.Should().BeEmpty();
    }

    [Fact]
    public void Dismiss_UnknownJob_ReturnsNotFound()
    {
        var (svc, _, _) = NewService(featureEnabled: true);

        var result = svc.Dismiss(Guid.NewGuid(), Guid.NewGuid());

        result.ErrorKind.Should().Be(Core.Common.ServiceErrorKind.NotFound);
    }

    [Fact]
    public async Task Dismiss_OtherUsersJob_ReturnsForbidden()
    {
        var (svc, ctx, _) = NewService(featureEnabled: true);
        var owner = SeedUser(ctx);
        var (_, page) = SeedDocWithEmptyPage(ctx, owner.Id);
        var started = await svc.StartAsync(AutoFillScope.Page, page.Id, owner.Id);

        var result = svc.Dismiss(started.Value!.JobId, Guid.NewGuid());

        result.ErrorKind.Should().Be(Core.Common.ServiceErrorKind.Forbidden);
    }

    [Fact]
    public async Task Dismiss_CompletedJob_RemovesFromList()
    {
        var (svc, ctx, _) = NewService(featureEnabled: true);
        var owner = SeedUser(ctx);
        var (_, page) = SeedDocWithEmptyPage(ctx, owner.Id);
        var started = await svc.StartAsync(AutoFillScope.Page, page.Id, owner.Id);

        var dismissed = svc.Dismiss(started.Value!.JobId, owner.Id);

        dismissed.IsSuccess.Should().BeTrue();
        svc.List(owner.Id).Value!.Should().BeEmpty();
    }

    [Fact]
    public async Task DismissAllCompleted_OnlyRemovesCallerCompleted()
    {
        var (svc, ctx, _) = NewService(featureEnabled: true);
        var owner = SeedUser(ctx);
        var (_, page) = SeedDocWithEmptyPage(ctx, owner.Id);
        await svc.StartAsync(AutoFillScope.Page, page.Id, owner.Id);

        var result = svc.DismissAllCompleted(owner.Id);

        result.IsSuccess.Should().BeTrue();
        svc.List(owner.Id).Value!.Should().BeEmpty();
    }

    private sealed class FakeSettings : IAppSettingsService
    {
        public bool Enabled { get; set; }
        public Task<bool> GetBoolAsync(string key, bool defaultValue = false, CancellationToken ct = default)
            => Task.FromResult(key == AppSettingKeys.AutoContentGeneratorEnabled ? Enabled : defaultValue);
        public Task<IReadOnlyDictionary<string, string>> GetAllAsync(CancellationToken ct = default)
            => Task.FromResult<IReadOnlyDictionary<string, string>>(new Dictionary<string, string>());
        public Task SetAsync(string key, string value, Guid? updatedByUserId = null, CancellationToken ct = default)
            => Task.CompletedTask;
    }
}
