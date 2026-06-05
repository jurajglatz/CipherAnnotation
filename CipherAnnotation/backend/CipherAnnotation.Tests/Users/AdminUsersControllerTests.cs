using System.Security.Claims;
using CipherAnnotation.API.Controllers;
using CipherAnnotation.Core.DTOs.Auth;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;

namespace CipherAnnotation.Tests.Users;

public class AdminUsersControllerTests
{
    private static AppDbContext NewCtx() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static User SeedUser(AppDbContext ctx, string name, string email, UserRole role = UserRole.User)
    {
        var user = new User { Id = Guid.NewGuid(), Name = name, Email = email, Role = role };
        ctx.Users.Add(user);
        ctx.SaveChanges();
        return user;
    }

    private static AdminUsersController NewController(AppDbContext ctx, Guid callerId)
    {
        var controller = new AdminUsersController(ctx, NullLogger<AdminUsersController>.Instance);
        var identity = new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, callerId.ToString()),
        });
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) },
        };
        return controller;
    }

    [Fact]
    public async Task List_ReturnsPaginatedUsers()
    {
        await using var ctx = NewCtx();
        var admin = SeedUser(ctx, "Admin", "admin@x.com", UserRole.Admin);
        SeedUser(ctx, "Bob", "bob@x.com");
        SeedUser(ctx, "Carol", "carol@x.com");

        var controller = NewController(ctx, admin.Id);
        var result = await controller.ListAsync(q: null, page: 1, pageSize: 2, CancellationToken.None);

        var ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var body = ok.Value.Should().BeOfType<PagedUsersResponse>().Subject;
        body.Total.Should().Be(3);
        body.Data.Should().HaveCount(2);
        body.Page.Should().Be(1);
        body.PageSize.Should().Be(2);
    }

    [Fact]
    public async Task List_FiltersByQuery()
    {
        await using var ctx = NewCtx();
        var admin = SeedUser(ctx, "Admin", "admin@x.com", UserRole.Admin);
        SeedUser(ctx, "Bob", "bob@x.com");
        SeedUser(ctx, "Carol", "carol@x.com");

        var controller = NewController(ctx, admin.Id);
        var result = await controller.ListAsync(q: "carol", page: 1, pageSize: 10, CancellationToken.None);

        var body = (result.Result as OkObjectResult)!.Value as PagedUsersResponse;
        body!.Total.Should().Be(1);
        body.Data.Single().Name.Should().Be("Carol");
    }

    [Fact]
    public async Task UpdateRole_ChangesRole_Returns204()
    {
        await using var ctx = NewCtx();
        var admin = SeedUser(ctx, "Admin", "admin@x.com", UserRole.Admin);
        var bob = SeedUser(ctx, "Bob", "bob@x.com");

        var controller = NewController(ctx, admin.Id);
        var result = await controller.UpdateRoleAsync(bob.Id, new UpdateRoleRequest("Admin"), CancellationToken.None);

        result.Should().BeOfType<NoContentResult>();
        ctx.Users.Single(u => u.Id == bob.Id).Role.Should().Be(UserRole.Admin);
    }

    [Fact]
    public async Task UpdateRole_OwnRole_Returns400()
    {
        await using var ctx = NewCtx();
        var admin = SeedUser(ctx, "Admin", "admin@x.com", UserRole.Admin);

        var controller = NewController(ctx, admin.Id);
        var result = await controller.UpdateRoleAsync(admin.Id, new UpdateRoleRequest("User"), CancellationToken.None);

        result.Should().BeOfType<BadRequestObjectResult>();
        ctx.Users.Single(u => u.Id == admin.Id).Role.Should().Be(UserRole.Admin);
    }

    [Fact]
    public async Task UpdateRole_UnknownUser_Returns404()
    {
        await using var ctx = NewCtx();
        var admin = SeedUser(ctx, "Admin", "admin@x.com", UserRole.Admin);

        var controller = NewController(ctx, admin.Id);
        var result = await controller.UpdateRoleAsync(Guid.NewGuid(), new UpdateRoleRequest("Admin"), CancellationToken.None);

        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task UpdateRole_InvalidRole_Returns400()
    {
        await using var ctx = NewCtx();
        var admin = SeedUser(ctx, "Admin", "admin@x.com", UserRole.Admin);
        var bob = SeedUser(ctx, "Bob", "bob@x.com");

        var controller = NewController(ctx, admin.Id);
        var result = await controller.UpdateRoleAsync(bob.Id, new UpdateRoleRequest("Wizard"), CancellationToken.None);

        result.Should().BeOfType<BadRequestObjectResult>();
    }
}
