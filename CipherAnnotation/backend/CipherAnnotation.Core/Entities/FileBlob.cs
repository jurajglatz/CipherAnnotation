namespace CipherAnnotation.Core.Entities;

/// <summary>
/// Binary file (image) stored directly in the database.
/// </summary>
public class FileBlob
{
    public Guid Id { get; set; }

    /// <summary>Raw bytes of the file. Mapped to PostgreSQL bytea.</summary>
    public required byte[] Data { get; set; }

    /// <summary>MIME type, e.g. image/png.</summary>
    public required string ContentType { get; set; }

    /// <summary>Original file name (for download/export).</summary>
    public required string FileName { get; set; }

    /// <summary>Size in bytes (denormalized for quick listing).</summary>
    public long SizeBytes { get; set; }

    /// <summary>SHA-256 hex digest — enables ETag and dedup.</summary>
    public required string Sha256 { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
