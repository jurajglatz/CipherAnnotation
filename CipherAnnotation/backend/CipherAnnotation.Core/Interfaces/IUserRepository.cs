using CipherAnnotation.Core.Entities;

namespace CipherAnnotation.Core.Interfaces;

/// <summary>
/// Repository interface for user-specific data access operations.
/// </summary>
public interface IUserRepository : IRepository<User>
{
    /// <summary>
    /// Gets a user by their email address asynchronously.
    /// </summary>
    /// <param name="email">The email address of the user.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The user if found; otherwise null.</returns>
    Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default);
}
