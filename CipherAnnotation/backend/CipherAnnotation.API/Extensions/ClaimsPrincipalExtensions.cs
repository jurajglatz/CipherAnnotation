using System.Security.Claims;

namespace CipherAnnotation.API.Extensions;

public static class ClaimsPrincipalExtensions
{
    /// <summary>
    /// Returns the authenticated user's id. Throws if the principal is missing
    /// a valid NameIdentifier claim — this should never happen on an action
    /// guarded by [Authorize], so a throw here surfaces a token-shape bug
    /// rather than papering over it with a 401.
    /// </summary>
    public static Guid GetUserId(this ClaimsPrincipal user)
    {
        var raw = user.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(raw, out var id) || id == Guid.Empty)
            throw new InvalidOperationException(
                "Authenticated request is missing a valid NameIdentifier claim.");
        return id;
    }

    /// <summary>
    /// Returns the authenticated user's id, or null if the principal isn't
    /// authenticated or has no valid id claim. Use on endpoints that allow
    /// anonymous access but adjust behavior when a user is signed in.
    /// </summary>
    public static Guid? TryGetUserId(this ClaimsPrincipal user)
    {
        var raw = user.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(raw, out var id) && id != Guid.Empty ? id : null;
    }
}
