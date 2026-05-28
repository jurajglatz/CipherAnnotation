using CipherAnnotation.Core.Common;
using CipherAnnotation.Core.DTOs.Document;
using CipherAnnotation.Core.DTOs.Export;
using CipherAnnotation.Core.Interfaces;
using CipherAnnotation.Infrastructure.Services.Export;
using Microsoft.Extensions.Logging.Abstractions;

namespace CipherAnnotation.Tests.Export;

public class ExportOrchestrationServiceTests
{
    private static AppDbContext NewCtx() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static (ExportOrchestrationService svc, AppDbContext ctx, FakeExportService fake) NewService()
    {
        var ctx = NewCtx();
        var fake = new FakeExportService();
        var svc = new ExportOrchestrationService(ctx, fake, NullLogger<ExportOrchestrationService>.Instance);
        return (svc, ctx, fake);
    }

    private static User SeedUser(AppDbContext ctx, string email = "owner@example.com")
    {
        var u = new User { Id = Guid.NewGuid(), Email = email, Name = email };
        ctx.Users.Add(u);
        ctx.SaveChanges();
        return u;
    }

    private static Document SeedDoc(AppDbContext ctx, Guid ownerId)
    {
        var doc = new Document
        {
            Id = Guid.NewGuid(),
            Title = "D",
            OwnerId = ownerId,
            Visibility = Visibility.Private,
        };
        ctx.Documents.Add(doc);
        ctx.SaveChanges();
        return doc;
    }

    private static ExportRequest CocoReq(params Guid[] docIds) => new()
    {
        DocumentIds = docIds.ToList(),
        Format = "COCO",
        IncludeImages = false,
    };

    [Fact]
    public async Task ExportCoco_EmptyUserId_ReturnsUnauthorized()
    {
        var (svc, _, _) = NewService();

        var r = await svc.ExportCocoAsync(Guid.Empty, CocoReq(Guid.NewGuid()));

        r.ErrorKind.Should().Be(ServiceErrorKind.Unauthorized);
    }

    [Fact]
    public async Task ExportCoco_NoDocumentIds_ReturnsBadRequest()
    {
        var (svc, _, _) = NewService();

        var r = await svc.ExportCocoAsync(Guid.NewGuid(), new ExportRequest
        {
            DocumentIds = new List<Guid>(),
            Format = "COCO",
        });

        r.ErrorKind.Should().Be(ServiceErrorKind.BadRequest);
    }

    [Fact]
    public async Task ExportCoco_UnknownDocument_ReturnsNotFound()
    {
        var (svc, _, _) = NewService();

        var r = await svc.ExportCocoAsync(Guid.NewGuid(), CocoReq(Guid.NewGuid()));

        r.ErrorKind.Should().Be(ServiceErrorKind.NotFound);
    }

    [Fact]
    public async Task ExportCoco_NotOwnerAndNotShared_ReturnsForbidden()
    {
        var (svc, ctx, _) = NewService();
        var owner = SeedUser(ctx);
        var doc = SeedDoc(ctx, owner.Id);

        var r = await svc.ExportCocoAsync(Guid.NewGuid(), CocoReq(doc.Id));

        r.ErrorKind.Should().Be(ServiceErrorKind.Forbidden);
    }

    [Fact]
    public async Task ExportCoco_OwnerHappyPath_ReturnsJsonArtifact()
    {
        var (svc, ctx, fake) = NewService();
        var owner = SeedUser(ctx);
        var doc = SeedDoc(ctx, owner.Id);
        fake.JsonBody = "{\"ok\":true}";

        var r = await svc.ExportCocoAsync(owner.Id, CocoReq(doc.Id));

        r.IsSuccess.Should().BeTrue();
        r.Value!.ContentType.Should().Be("application/json");
        r.Value.FileName.Should().StartWith("export_coco_").And.EndWith(".json");
        System.Text.Encoding.UTF8.GetString(r.Value.Content).Should().Be("{\"ok\":true}");
    }

    [Fact]
    public async Task ImportCoco_NotAdmin_ReturnsForbidden()
    {
        var (svc, _, _) = NewService();

        var r = await svc.ImportCocoAsync(
            Guid.NewGuid(), isAdmin: false,
            new UploadedFile(new byte[] { 1, 2 }, "a.json", "application/json"));

        r.ErrorKind.Should().Be(ServiceErrorKind.Forbidden);
    }

    [Fact]
    public async Task ImportCoco_EmptyFile_ReturnsBadRequest()
    {
        var (svc, _, _) = NewService();

        var r = await svc.ImportCocoAsync(
            Guid.NewGuid(), isAdmin: true,
            new UploadedFile(Array.Empty<byte>(), "a.json", "application/json"));

        r.ErrorKind.Should().Be(ServiceErrorKind.BadRequest);
    }

    [Fact]
    public async Task ImportCoco_UnknownDocument_ReturnsNotFound()
    {
        var (svc, _, _) = NewService();

        var r = await svc.ImportCocoAsync(
            Guid.NewGuid(), isAdmin: true,
            new UploadedFile(new byte[] { 1 }, "a.json", "application/json"));

        r.ErrorKind.Should().Be(ServiceErrorKind.NotFound);
    }

    private sealed class FakeExportService : IExportService
    {
        public string JsonBody { get; set; } = "{}";

        public Task ExportCocoAsync(Guid documentId, string outputPath, string? imagesDirectory = null, CancellationToken ct = default)
        {
            File.WriteAllText(outputPath, JsonBody);
            if (imagesDirectory != null) Directory.CreateDirectory(imagesDirectory);
            return Task.CompletedTask;
        }
        public Task ExportYoloAsync(Guid documentId, string outputPath, float trainTestSplit = 0.8f, CancellationToken ct = default) => Task.CompletedTask;
        public Task ExportTfRecordAsync(Guid documentId, string outputPath, float trainTestSplit = 0.8f, CancellationToken ct = default) => Task.CompletedTask;
        public Task ImportCocoAsync(Guid documentId, string cocoJsonPath, CancellationToken ct = default) => Task.CompletedTask;
        public Task ImportYoloAsync(Guid documentId, string yoloDirectoryPath, CancellationToken ct = default) => Task.CompletedTask;
    }
}
