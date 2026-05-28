using CipherAnnotation.API.Validation;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;

namespace CipherAnnotation.Tests.Api;

public class UploadValidatorTests
{
    private static UploadValidator NewValidator(
        int maxFileMb = 1,
        int maxPages = 3,
        string[]? mimes = null)
    {
        var opts = new UploadValidationOptions
        {
            MaxFileSizeMB = maxFileMb,
            MaxPagesPerDocument = maxPages,
            AllowedImageMimeTypes = mimes ?? new[] { "image/png", "image/jpeg" },
        };
        return new UploadValidator(Options.Create(opts));
    }

    private static IFormFile MakeFile(long length, string contentType = "image/png", string name = "f.png")
    {
        var file = new FormFile(new MemoryStream(new byte[Math.Min(length, 1)]), 0, length, "file", name)
        {
            Headers = new HeaderDictionary(),
            ContentType = contentType,
        };
        return file;
    }

    [Fact]
    public void Validate_Empty_Rejected()
    {
        NewValidator().Validate(MakeFile(0)).Should().Contain("empty");
    }

    [Fact]
    public void Validate_Oversize_Rejected()
    {
        var validator = NewValidator(maxFileMb: 1);
        var tooBig = 2L * 1024 * 1024;

        validator.Validate(MakeFile(tooBig)).Should().Contain("limit");
    }

    [Fact]
    public void Validate_DisallowedMime_Rejected()
    {
        NewValidator().Validate(MakeFile(100, contentType: "application/pdf"))
            .Should().Contain("unsupported MIME type");
    }

    [Fact]
    public void Validate_MimeCaseInsensitive_Accepted()
    {
        NewValidator().Validate(MakeFile(100, contentType: "IMAGE/PNG"))
            .Should().BeNull();
    }

    [Fact]
    public void Validate_HappyPath_ReturnsNull()
    {
        NewValidator().Validate(MakeFile(100)).Should().BeNull();
    }

    [Fact]
    public void ValidateSize_SkipsMimeCheck()
    {
        NewValidator().ValidateSize(MakeFile(100, contentType: "application/json")).Should().BeNull();
    }

    [Fact]
    public void ValidateSize_EmptyAndOversize_Rejected()
    {
        var v = NewValidator(maxFileMb: 1);
        v.ValidateSize(MakeFile(0)).Should().Contain("empty");
        v.ValidateSize(MakeFile(2L * 1024 * 1024)).Should().Contain("limit");
    }

    [Fact]
    public void ValidateBatch_TooManyFiles_Rejected()
    {
        var v = NewValidator(maxPages: 2);
        var files = new[] { MakeFile(100), MakeFile(100), MakeFile(100) };

        v.ValidateBatch(files).Should().Contain("Too many files");
    }

    [Fact]
    public void ValidateBatch_PropagatesPerFileError()
    {
        var v = NewValidator();
        var files = new[] { MakeFile(100), MakeFile(0) };

        v.ValidateBatch(files).Should().Contain("empty");
    }

    [Fact]
    public void ValidateBatch_HappyPath_ReturnsNull()
    {
        var v = NewValidator();
        var files = new[] { MakeFile(100), MakeFile(200) };

        v.ValidateBatch(files).Should().BeNull();
    }

    [Fact]
    public void ValidateSizeBatch_TooManyFiles_Rejected()
    {
        var v = NewValidator(maxPages: 1);
        var files = new[] { MakeFile(100, "application/json"), MakeFile(100, "application/json") };

        v.ValidateSizeBatch(files).Should().Contain("Too many files");
    }

    [Fact]
    public void ValidateSizeBatch_HappyPath_ReturnsNull()
    {
        var v = NewValidator();
        var files = new[] { MakeFile(100, "application/json"), MakeFile(200, "application/xml") };

        v.ValidateSizeBatch(files).Should().BeNull();
    }
}
