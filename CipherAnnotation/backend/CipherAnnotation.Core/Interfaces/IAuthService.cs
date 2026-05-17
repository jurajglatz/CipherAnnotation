using CipherAnnotation.Core.Entities;

namespace CipherAnnotation.Core.Interfaces;

public record TokenPair(
    string AccessToken,
    string RefreshToken,
    DateTime AccessTokenExpiresAt);

public record RefreshResult(
    string AccessToken,
    string RefreshToken,
    DateTime AccessTokenExpiresAt,
    User User);

public interface IAuthService
{
    Task<User> RegisterAsync(string email, string password, string name, CancellationToken cancellationToken = default);

    Task<User?> LoginAsync(string email, string password, CancellationToken cancellationToken = default);

    Task<User> GoogleLoginAsync(string googleToken, CancellationToken cancellationToken = default);

    /// <summary>
    /// Issues a fresh access + refresh token pair for the given user.
    /// </summary>
    Task<TokenPair> IssueTokensAsync(User user, CancellationToken cancellationToken = default);

    /// <summary>
    /// Validates a raw refresh token, rotates it, and returns a new pair.
    /// Returns null if the token is unknown, expired, or revoked. If a revoked
    /// token is replayed, all of that user's active refresh tokens are also revoked.
    /// </summary>
    Task<RefreshResult?> RefreshAsync(string refreshToken, CancellationToken cancellationToken = default);

    /// <summary>
    /// Revokes the refresh token if it exists. No-op if missing or already revoked.
    /// </summary>
    Task RevokeRefreshTokenAsync(string refreshToken, CancellationToken cancellationToken = default);
}
