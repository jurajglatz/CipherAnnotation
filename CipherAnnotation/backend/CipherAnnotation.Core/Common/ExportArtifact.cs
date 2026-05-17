namespace CipherAnnotation.Core.Common;

public sealed record ExportArtifact(byte[] Content, string ContentType, string FileName);

public sealed record ImportResult(string Message, Guid DocumentId, DateTime ImportedAt);
