using CipherAnnotation.Core.Entities;

namespace CipherAnnotation.Core.Interfaces;

/// <summary>
/// Repository interface for document-specific data access operations.
/// </summary>
public interface IDocumentRepository : IRepository<Document>
{
    /// <summary>
    /// Gets all documents owned by a specific user asynchronously.
    /// </summary>
    /// <param name="ownerId">The unique identifier of the document owner.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of documents owned by the user.</returns>
    Task<IEnumerable<Document>> GetByOwnerIdAsync(Guid ownerId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets all public documents in the system asynchronously.
    /// </summary>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of all public documents.</returns>
    Task<IEnumerable<Document>> GetPublicDocumentsAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets all documents shared with a specific user asynchronously.
    /// </summary>
    /// <param name="userId">The unique identifier of the user.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of documents shared with the user.</returns>
    Task<IEnumerable<Document>> GetSharedWithUserAsync(Guid userId, CancellationToken cancellationToken = default);
}
