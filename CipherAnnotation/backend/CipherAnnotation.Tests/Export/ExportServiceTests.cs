using CipherAnnotation.Infrastructure.Services.Export;
using Microsoft.Extensions.Logging.Abstractions;

namespace CipherAnnotation.Tests.Export;

public class ExportServiceTests
{
    private static AppDbContext NewCtx() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static readonly byte[] ImageBytes = { 1, 2, 3, 4, 5 };

    private static Guid SeedDocumentWithOnePage(AppDbContext ctx)
    {
        var blob = new FileBlob
        {
            Id = Guid.NewGuid(),
            Data = ImageBytes,
            ContentType = "image/png",
            FileName = "scan.png",
            Sha256 = "deadbeef",
        };
        ctx.FileBlobs.Add(blob);

        var doc = new Document
        {
            Id = Guid.NewGuid(),
            Title = "Doc",
            OwnerId = Guid.NewGuid(),
            Visibility = Visibility.Private,
        };
        ctx.Documents.Add(doc);

        ctx.Pages.Add(new Page
        {
            Id = Guid.NewGuid(),
            DocumentId = doc.Id,
            PageNumber = 1,
            ImageBlobId = blob.Id,
            Width = 100,
            Height = 200,
            Orientation = 0,
            ResolutionDPI = 72,
        });

        ctx.SaveChanges();
        return doc.Id;
    }

    [Fact]
    public async Task ExportCocoAsync_WithoutImagesDirectory_WritesOnlyJson()
    {
        var ctx = NewCtx();
        var docId = SeedDocumentWithOnePage(ctx);
        var svc = new ExportService(ctx, NullLogger<ExportService>.Instance);

        var folder = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
        Directory.CreateDirectory(folder);
        try
        {
            var jsonPath = Path.Combine(folder, "annotations.json");
            await svc.ExportCocoAsync(docId, jsonPath, imagesDirectory: null);

            File.Exists(jsonPath).Should().BeTrue();
            Directory.GetFiles(folder).Should().ContainSingle()
                .Which.Should().EndWith("annotations.json");
        }
        finally
        {
            Directory.Delete(folder, true);
        }
    }

    [Fact]
    public async Task ExportCocoAsync_WithImagesDirectory_WritesImageMatchingJsonFileName()
    {
        var ctx = NewCtx();
        var docId = SeedDocumentWithOnePage(ctx);
        var svc = new ExportService(ctx, NullLogger<ExportService>.Instance);

        var folder = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
        var imagesDir = Path.Combine(folder, "images");
        Directory.CreateDirectory(folder);
        try
        {
            var jsonPath = Path.Combine(folder, "annotations.json");
            await svc.ExportCocoAsync(docId, jsonPath, imagesDir);

            File.Exists(jsonPath).Should().BeTrue();

            // The image file name must match the file_name referenced in the JSON.
            var expectedImage = Path.Combine(imagesDir, "page_0001.png");
            File.Exists(expectedImage).Should().BeTrue();
            (await File.ReadAllBytesAsync(expectedImage)).Should().Equal(ImageBytes);

            var json = await File.ReadAllTextAsync(jsonPath);
            json.Should().Contain("page_0001.png");
        }
        finally
        {
            Directory.Delete(folder, true);
        }
    }
}
