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

    /// <summary>
    /// Searches for users whose name or email contains the given query.
    /// </summary>
    /// <param name="query">The search query (matched against name or email).</param>
    /// <param name="limit">The maximum number of users to return.</param>
    /// <param name="excludeUserId">Optional user ID to exclude from the results (e.g. the current user).</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A list of matching users, ordered by name.</returns>
    Task<IEnumerable<User>> SearchAsync(
        string query,
        int limit,
        Guid? excludeUserId = null,
        CancellationToken cancellationToken = default);
}
