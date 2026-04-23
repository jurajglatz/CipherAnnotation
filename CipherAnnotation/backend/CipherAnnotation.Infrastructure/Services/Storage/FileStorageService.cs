using System.Security.Cryptography;
using CipherAnnotation.Core.Entities;
using CipherAnnotation.Core.Interfaces;
using CipherAnnotation.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace CipherAnnotation.Infrastructure.Services.Storage;

/// <summary>
/// EF Core backed implementation of <see cref="IFileStorageService"/>.
/// Stores blobs in the FileBlobs table (PostgreSQL bytea).
/// </summary>
public class FileStorageService : IFileStorageService
{
    private readonly AppDbContext _db;

    public FileStorageService(AppDbContext db)
    {
        _db = db ?? throw new ArgumentNullException(nameof(db));
    }

    public async Task<Guid> SaveAsync(byte[] data, string fileName, string contentType, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(data);

        var sha = Convert.ToHexString(SHA256.HashData(data));

        var blob = new FileBlob
        {
            Id = Guid.NewGuid(),
            Data = data,
            ContentType = string.IsNullOrWhiteSpace(contentType) ? "application/octet-stream" : contentType,
            FileName = string.IsNullOrWhiteSpace(fileName) ? "file" : fileName,
            SizeBytes = data.LongLength,
            Sha256 = sha,
            CreatedAt = DateTime.UtcNow,
        };

        // Only attach to the context — caller is responsible for SaveChanges so
        // the blob is persisted in the same transaction as its referencing entity.
        await _db.FileBlobs.AddAsync(blob, cancellationToken);
        return blob.Id;
    }

    public Task<FileBlob?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => _db.FileBlobs.AsNoTracking().FirstOrDefaultAsync(b => b.Id == id, cancellationToken);

    public async Task<byte[]?> GetBytesAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var row = await _db.FileBlobs
            .AsNoTracking()
            .Where(b => b.Id == id)
            .Select(b => new { b.Data })
            .FirstOrDefaultAsync(cancellationToken);
        return row?.Data;
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var blob = await _db.FileBlobs.FindAsync(new object[] { id }, cancellationToken);
        if (blob == null) return;
        _db.FileBlobs.Remove(blob);
        await _db.SaveChangesAsync(cancellationToken);
    }
}
