using CipherAnnotation.Core.Entities;

namespace CipherAnnotation.Core.Interfaces;

/// <summary>
/// Stores and retrieves binary files (images) inside the database.
/// </summary>
public interface IFileStorageService
{
    /// <summary>Persists a new file blob and returns its id.</summary>
    Task<Guid> SaveAsync(byte[] data, string fileName, string contentType, CancellationToken cancellationToken = default);

    /// <summary>Reads a file blob fully from the database. Returns null if not found.</summary>
    Task<FileBlob?> GetAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>Reads raw bytes only. Returns null if not found.</summary>
    Task<byte[]?> GetBytesAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>Deletes a file blob by id. No-op if not found.</summary>
    Task DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
