using CipherAnnotation.Core.Entities;
using CipherAnnotation.Core.Interfaces;
using CipherAnnotation.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace CipherAnnotation.Infrastructure.Repositories;

/// <summary>
/// Repository implementation for user-specific data access operations.
/// </summary>
public class UserRepository : GenericRepository<User>, IUserRepository
{
    /// <summary>
    /// Initializes a new instance of the <see cref="UserRepository"/> class.
    /// </summary>
    /// <param name="context">The database context.</param>
    public UserRepository(AppDbContext context) : base(context)
    {
    }

    /// <summary>
    /// Gets a user by their email address asynchronously.
    /// </summary>
    /// <param name="email">The email address of the user.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The user if found; otherwise null.</returns>
    public async Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            throw new ArgumentException("Email cannot be null or empty.", nameof(email));
        }

        return await _dbSet
            .Include(u => u.OwnedDocuments)
            .FirstOrDefaultAsync(u => u.Email.ToLower() == email.ToLower(), cancellationToken);
    }
}
