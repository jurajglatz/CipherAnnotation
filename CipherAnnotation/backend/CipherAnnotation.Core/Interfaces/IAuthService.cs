using CipherAnnotation.Core.Entities;

namespace CipherAnnotation.Core.Interfaces;

/// <summary>
/// Service interface for authentication and authorization operations.
/// </summary>
public interface IAuthService
{
    /// <summary>
    /// Registers a new user with email and password asynchronously.
    /// </summary>
    /// <param name="email">The email address of the new user.</param>
    /// <param name="password">The password for the new user.</param>
    /// <param name="name">The name of the new user.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The created user entity.</returns>
    Task<User> RegisterAsync(string email, string password, string name, CancellationToken cancellationToken = default);

    /// <summary>
    /// Authenticates a user with email and password asynchronously.
    /// </summary>
    /// <param name="email">The email address of the user.</param>
    /// <param name="password">The password of the user.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The authenticated user entity if successful; otherwise null.</returns>
    Task<User?> LoginAsync(string email, string password, CancellationToken cancellationToken = default);

    /// <summary>
    /// Authenticates or registers a user via Google OAuth asynchronously.
    /// </summary>
    /// <param name="googleToken">The Google OAuth token.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The user entity associated with the Google account.</returns>
    Task<User> GoogleLoginAsync(string googleToken, CancellationToken cancellationToken = default);

    /// <summary>
    /// Generates a JWT token for a user asynchronously.
    /// </summary>
    /// <param name="user">The user to generate a token for.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A JWT token string.</returns>
    Task<string> GenerateJwtToken(User user, CancellationToken cancellationToken = default);
}
