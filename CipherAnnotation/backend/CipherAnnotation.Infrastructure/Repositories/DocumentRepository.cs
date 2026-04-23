using CipherAnnotation.Core.Entities;
using CipherAnnotation.Core.Enums;
using CipherAnnotation.Core.Interfaces;
using CipherAnnotation.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace CipherAnnotation.Infrastructure.Repositories;

/// <summary>
/// Repository implementation for document-specific data access operations.
/// </summary>
public class DocumentRepository : GenericRepository<Document>, IDocumentRepository
{
    /// <summary>
    /// Initializes a new instance of the <see cref="DocumentRepository"/> class.
    /// </summary>
    /// <param name="context">The database context.</param>
    public DocumentRepository(AppDbContext context) : base(context)
    {
    }

    /// <summary>
    /// Gets a document by its identifier with all related entities loaded asynchronously.
    /// </summary>
    /// <param name="id">The unique identifier of the document.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The document if found; otherwise null.</returns>
    public override async Task<Document?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .Include(d => d.Owner)
            .Include(d => d.Pages)
            .Include(d => d.Shares)
                .ThenInclude(ds => ds.User)
            .FirstOrDefaultAsync(d => d.Id == id, cancellationToken);
    }

    /// <summary>
    /// Gets all documents owned by a specific user asynchronously.
    /// </summary>
    /// <param name="ownerId">The unique identifier of the document owner.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of documents owned by the user.</returns>
    public async Task<IEnumerable<Document>> GetByOwnerIdAsync(Guid ownerId, CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .Where(d => d.OwnerId == ownerId)
            .Include(d => d.Pages)
            .OrderByDescending(d => d.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Gets all public documents in the system asynchronously.
    /// </summary>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of all public documents.</returns>
    public async Task<IEnumerable<Document>> GetPublicDocumentsAsync(CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .Where(d => d.Visibility == Visibility.Public)
            .Include(d => d.Owner)
            .Include(d => d.Pages)
            .OrderByDescending(d => d.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Gets all documents shared with a specific user asynchronously.
    /// </summary>
    /// <param name="userId">The unique identifier of the user.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of documents shared with the user.</returns>
    public async Task<IEnumerable<Document>> GetSharedWithUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _context.DocumentShares
            .Where(ds => ds.UserId == userId)
            .Include(ds => ds.Document)
                .ThenInclude(d => d!.Owner)
            .Include(ds => ds.Document)
                .ThenInclude(d => d!.Pages)
            .Select(ds => ds.Document!)
            .OrderByDescending(d => d.CreatedAt)
            .ToListAsync(cancellationToken);
    }
}
