namespace CipherAnnotation.Tests.Annotations;

public class CascadeAndRefTests
{
    private static AppDbContext NewCtx()
    {
        var opts = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(opts);
    }

    [Fact]
    public async Task DeletingParent_RemovesParentRow()
    {
        await using var ctx = NewCtx();
        var doc = new Document { Title = "doc", OwnerId = Guid.NewGuid() };
        var page = new Page
        {
            DocumentId = doc.Id,
            PageNumber = 1,
            ImageBlobId = Guid.NewGuid(),
            Width = 1,
            Height = 1,
            Orientation = 0,
            ResolutionDPI = 72,
        };
        var cap = new Caption { DocumentId = doc.Id, Name = "Section" };
        ctx.AddRange(doc, page, cap);
        await ctx.SaveChangesAsync();

        var root = new Annotation { PageId = page.Id, CaptionId = cap.Id, Type = AnnotationType.Text, Orientation = 0 };
        ctx.Add(root);
        await ctx.SaveChangesAsync();

        ctx.Annotations.Remove(root);
        await ctx.SaveChangesAsync();

        (await ctx.Annotations.FindAsync(root.Id)).Should().BeNull();
    }
}
