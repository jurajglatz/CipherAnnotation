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

    private static (Guid docId, Page page) SeedDocumentWithOnePageAndAnnotations(
        AppDbContext ctx, int annotationCount = 2)
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
            Title = "Doc \"with quote\"",
            Author = "Author A",
            OwnerId = Guid.NewGuid(),
            Visibility = Visibility.Private,
        };
        ctx.Documents.Add(doc);

        var caption = new Caption { Id = Guid.NewGuid(), DocumentId = doc.Id, Name = "Section" };
        ctx.Captions.Add(caption);

        var page = new Page
        {
            Id = Guid.NewGuid(),
            DocumentId = doc.Id,
            PageNumber = 1,
            ImageBlobId = blob.Id,
            Width = 100,
            Height = 200,
            Orientation = 0,
            ResolutionDPI = 72,
        };
        ctx.Pages.Add(page);

        for (int i = 0; i < annotationCount; i++)
        {
            var ann = new Annotation
            {
                Id = Guid.NewGuid(),
                PageId = page.Id,
                CaptionId = caption.Id,
                Type = AnnotationType.Text,
                Orientation = 0,
                Content = i == 0 ? "alpha" : null,
                BoundingBox = new BoundingBox { X = 10 + i, Y = 20 + i, Width = 5, Height = 6 },
            };
            ctx.Annotations.Add(ann);
        }

        ctx.SaveChanges();
        return (doc.Id, page);
    }

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

    [Fact]
    public async Task ExportCocoAsync_WithAnnotations_EmitsBboxAndCategoryArrays()
    {
        var ctx = NewCtx();
        var (docId, _) = SeedDocumentWithOnePageAndAnnotations(ctx);
        var svc = new ExportService(ctx, NullLogger<ExportService>.Instance);

        var folder = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
        Directory.CreateDirectory(folder);
        try
        {
            var jsonPath = Path.Combine(folder, "annotations.json");
            await svc.ExportCocoAsync(docId, jsonPath);

            var json = await File.ReadAllTextAsync(jsonPath);
            json.Should().Contain("\"bbox\":");
            json.Should().Contain("\"area\":");
            json.Should().Contain("\"categories\":");
            // Both names should make it in as categories
            json.Should().Contain("alpha");
            json.Should().Contain("Section");
        }
        finally
        {
            Directory.Delete(folder, true);
        }
    }

    [Fact]
    public async Task ExportCocoAsync_MissingDocument_Throws()
    {
        var ctx = NewCtx();
        var svc = new ExportService(ctx, NullLogger<ExportService>.Instance);
        var jsonPath = Path.Combine(Path.GetTempPath(), $"{Guid.NewGuid()}.json");

        var act = () => svc.ExportCocoAsync(Guid.NewGuid(), jsonPath);

        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task ExportYoloAsync_WritesLabelsImagesAndDataYaml()
    {
        var ctx = NewCtx();
        var (docId, _) = SeedDocumentWithOnePageAndAnnotations(ctx);
        var svc = new ExportService(ctx, NullLogger<ExportService>.Instance);

        var folder = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
        try
        {
            await svc.ExportYoloAsync(docId, folder, trainTestSplit: 1.0f);

            File.Exists(Path.Combine(folder, "data.yaml")).Should().BeTrue();
            File.Exists(Path.Combine(folder, "train.txt")).Should().BeTrue();
            File.Exists(Path.Combine(folder, "val.txt")).Should().BeTrue();
            File.Exists(Path.Combine(folder, "images", "page_0001.png")).Should().BeTrue();
            var label = await File.ReadAllTextAsync(Path.Combine(folder, "labels", "page_0001.txt"));
            // 2 annotations -> 2 lines starting with class index
            label.Trim().Split('\n').Should().HaveCount(2);

            var yaml = await File.ReadAllTextAsync(Path.Combine(folder, "data.yaml"));
            yaml.Should().Contain("nc: 2");
            yaml.Should().Contain("names: [");
        }
        finally
        {
            if (Directory.Exists(folder)) Directory.Delete(folder, true);
        }
    }

    [Fact]
    public async Task ExportTfRecordAsync_WritesTrainValAndLabelMap()
    {
        var ctx = NewCtx();
        var (docId, _) = SeedDocumentWithOnePageAndAnnotations(ctx);
        var svc = new ExportService(ctx, NullLogger<ExportService>.Instance);

        var folder = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
        try
        {
            await svc.ExportTfRecordAsync(docId, folder, trainTestSplit: 1.0f);

            File.Exists(Path.Combine(folder, "train.tfrecord")).Should().BeTrue();
            File.Exists(Path.Combine(folder, "val.tfrecord")).Should().BeTrue();
            File.Exists(Path.Combine(folder, "label_map.pbtxt")).Should().BeTrue();
            File.Exists(Path.Combine(folder, "README.txt")).Should().BeTrue();

            var trainBytes = await File.ReadAllBytesAsync(Path.Combine(folder, "train.tfrecord"));
            // Single page -> one TFRecord frame; framing adds 8 (len) + 4 (len-crc) + N (data) + 4 (data-crc).
            trainBytes.Length.Should().BeGreaterThan(16);

            var labelMap = await File.ReadAllTextAsync(Path.Combine(folder, "label_map.pbtxt"));
            labelMap.Should().Contain("item {");
            labelMap.Should().Contain("name: \"alpha\"");
        }
        finally
        {
            if (Directory.Exists(folder)) Directory.Delete(folder, true);
        }
    }

    [Fact]
    public async Task ImportCocoAsync_NotImplemented()
    {
        var ctx = NewCtx();
        var svc = new ExportService(ctx, NullLogger<ExportService>.Instance);

        var act = () => svc.ImportCocoAsync(Guid.NewGuid(), "x.json");

        await act.Should().ThrowAsync<NotImplementedException>();
    }

    [Fact]
    public async Task ImportYoloAsync_NotImplemented()
    {
        var ctx = NewCtx();
        var svc = new ExportService(ctx, NullLogger<ExportService>.Instance);

        var act = () => svc.ImportYoloAsync(Guid.NewGuid(), "x");

        await act.Should().ThrowAsync<NotImplementedException>();
    }
}
