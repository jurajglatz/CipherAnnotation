using System.Security.Claims;
using CipherAnnotation.API.Extensions;

namespace CipherAnnotation.Tests.Api;

public class ClaimsPrincipalExtensionsTests
{
    private static ClaimsPrincipal PrincipalWith(string? nameIdValue)
    {
        var claims = nameIdValue is null
            ? Array.Empty<Claim>()
            : new[] { new Claim(ClaimTypes.NameIdentifier, nameIdValue) };
        return new ClaimsPrincipal(new ClaimsIdentity(claims, authenticationType: "test"));
    }

    [Fact]
    public void GetUserId_ValidGuid_ReturnsId()
    {
        var id = Guid.NewGuid();

        PrincipalWith(id.ToString()).GetUserId().Should().Be(id);
    }

    [Fact]
    public void GetUserId_MissingClaim_Throws()
    {
        var act = () => PrincipalWith(null).GetUserId();

        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void GetUserId_NotAGuid_Throws()
    {
        var act = () => PrincipalWith("not-a-guid").GetUserId();

        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void GetUserId_EmptyGuid_Throws()
    {
        var act = () => PrincipalWith(Guid.Empty.ToString()).GetUserId();

        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void TryGetUserId_ValidGuid_ReturnsId()
    {
        var id = Guid.NewGuid();

        PrincipalWith(id.ToString()).TryGetUserId().Should().Be(id);
    }

    [Fact]
    public void TryGetUserId_MissingOrInvalid_ReturnsNull()
    {
        PrincipalWith(null).TryGetUserId().Should().BeNull();
        PrincipalWith("bogus").TryGetUserId().Should().BeNull();
        PrincipalWith(Guid.Empty.ToString()).TryGetUserId().Should().BeNull();
    }
}
