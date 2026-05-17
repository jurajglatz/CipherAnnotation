using CipherAnnotation.Core.Interfaces;
using CipherAnnotation.Infrastructure.Repositories;
using CipherAnnotation.Infrastructure.Services.Auth;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace CipherAnnotation.Tests.Auth;

public class AuthServiceTests
{
    private static AppDbContext NewCtx() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static AuthService NewService(AppDbContext ctx)
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Key"] = "test-key-that-is-at-least-32-characters-long!!",
                ["Jwt:Issuer"] = "test",
                ["Jwt:Audience"] = "test",
                ["Jwt:ExpirationInMinutes"] = "15",
                ["Jwt:RefreshTokenLifetimeDays"] = "7",
            })
            .Build();

        return new AuthService(
            new UserRepository(ctx),
            ctx,
            config,
            NullLogger<AuthService>.Instance);
    }

    private static User SeedUser(AppDbContext ctx)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "user@example.com",
            Name = "User",
        };
        ctx.Users.Add(user);
        ctx.SaveChanges();
        return user;
    }

    [Fact]
    public async Task IssueTokensAsync_PersistsHashedToken_ReturnsRaw()
    {
        await using var ctx = NewCtx();
        var svc = NewService(ctx);
        var user = SeedUser(ctx);

        var pair = await svc.IssueTokensAsync(user);

        pair.AccessToken.Should().NotBeNullOrEmpty();
        pair.RefreshToken.Should().NotBeNullOrEmpty();
        pair.AccessTokenExpiresAt.Should().BeAfter(DateTime.UtcNow);

        var stored = ctx.RefreshTokens.Single();
        stored.UserId.Should().Be(user.Id);
        stored.TokenHash.Should().NotBe(pair.RefreshToken);
        stored.ExpiresAt.Should().BeAfter(DateTime.UtcNow.AddDays(6));
        stored.RevokedAt.Should().BeNull();
    }

    [Fact]
    public async Task RefreshAsync_HappyPath_RotatesToken()
    {
        await using var ctx = NewCtx();
        var svc = NewService(ctx);
        var user = SeedUser(ctx);
        var first = await svc.IssueTokensAsync(user);

        var result = await svc.RefreshAsync(first.RefreshToken);

        result.Should().NotBeNull();
        result!.RefreshToken.Should().NotBe(first.RefreshToken);

        var tokens = ctx.RefreshTokens.OrderBy(t => t.CreatedAt).ToList();
        tokens.Should().HaveCount(2);
        var old = tokens[0];
        var fresh = tokens[1];
        old.RevokedAt.Should().NotBeNull();
        old.ReplacedByTokenId.Should().Be(fresh.Id);
        fresh.RevokedAt.Should().BeNull();
    }

    [Fact]
    public async Task RefreshAsync_UnknownToken_ReturnsNull()
    {
        await using var ctx = NewCtx();
        var svc = NewService(ctx);

        var result = await svc.RefreshAsync("does-not-exist");

        result.Should().BeNull();
    }

    [Fact]
    public async Task RefreshAsync_ExpiredToken_ReturnsNull()
    {
        await using var ctx = NewCtx();
        var svc = NewService(ctx);
        var user = SeedUser(ctx);
        var pair = await svc.IssueTokensAsync(user);

        var stored = ctx.RefreshTokens.Single();
        stored.ExpiresAt = DateTime.UtcNow.AddMinutes(-1);
        await ctx.SaveChangesAsync();

        var result = await svc.RefreshAsync(pair.RefreshToken);

        result.Should().BeNull();
    }

    [Fact]
    public async Task RefreshAsync_RevokedToken_TriggersReplayDefense()
    {
        await using var ctx = NewCtx();
        var svc = NewService(ctx);
        var user = SeedUser(ctx);
        var first = await svc.IssueTokensAsync(user);

        var second = await svc.RefreshAsync(first.RefreshToken);
        second.Should().NotBeNull();

        // Replay the original (now revoked) token.
        var replay = await svc.RefreshAsync(first.RefreshToken);
        replay.Should().BeNull();

        // The currently-active token from the legitimate rotation must now also be revoked.
        ctx.ChangeTracker.Clear();
        var allTokens = ctx.RefreshTokens.ToList();
        allTokens.All(t => t.RevokedAt != null).Should().BeTrue();
    }

    [Fact]
    public async Task RevokeRefreshTokenAsync_MarksRevoked()
    {
        await using var ctx = NewCtx();
        var svc = NewService(ctx);
        var user = SeedUser(ctx);
        var pair = await svc.IssueTokensAsync(user);

        await svc.RevokeRefreshTokenAsync(pair.RefreshToken);

        ctx.RefreshTokens.Single().RevokedAt.Should().NotBeNull();
        (await svc.RefreshAsync(pair.RefreshToken)).Should().BeNull();
    }
}
