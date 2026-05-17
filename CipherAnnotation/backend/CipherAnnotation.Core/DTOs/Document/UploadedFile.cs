namespace CipherAnnotation.Core.DTOs.Document;

public sealed record UploadedFile(byte[] Content, string FileName, string ContentType);
