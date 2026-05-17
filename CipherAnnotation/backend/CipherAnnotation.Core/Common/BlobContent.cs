namespace CipherAnnotation.Core.Common;

public sealed record BlobContent(byte[] Data, string ContentType, string Sha256);
