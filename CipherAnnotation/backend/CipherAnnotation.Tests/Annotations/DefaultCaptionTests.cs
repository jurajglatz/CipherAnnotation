using CipherAnnotation.API.Controllers;

namespace CipherAnnotation.Tests.Annotations;

public class DefaultCaptionTests
{
    private static List<Caption> Make(params string[] names)
    {
        var docId = Guid.NewGuid();
        var t = DateTime.UtcNow;
        return names.Select((n, i) => new Caption
        {
            Id = Guid.NewGuid(),
            DocumentId = docId,
            Name = n,
            CreatedAt = t.AddSeconds(i),
        }).ToList();
    }

    [Fact]
    public void ResolvesByCreationOrder_NotByName()
    {
        var captions = Make("Word", "Pair", "Element");
        AnnotationsController.PickDefaultCaption(captions, depth: 0)!.Name.Should().Be("Word");
        AnnotationsController.PickDefaultCaption(captions, depth: 1)!.Name.Should().Be("Pair");
        AnnotationsController.PickDefaultCaption(captions, depth: 2)!.Name.Should().Be("Element");
    }

    [Fact]
    public void Depth3_ReturnsNullWhenNoFourthCaption_SoCallerCreatesIt()
    {
        var captions = Make("Section", "Pair", "Element");
        AnnotationsController.PickDefaultCaption(captions, depth: 3).Should().BeNull();
    }

    [Fact]
    public void Depth3_ReturnsFourthCaptionWhenPresent()
    {
        var captions = Make("Section", "Pair", "Element", "Annotation");
        AnnotationsController.PickDefaultCaption(captions, depth: 3)!.Name.Should().Be("Annotation");
    }

    [Fact]
    public void DepthBeyondCaptions_ReturnsNull_SoCallerAutoCreatesPerLevel()
    {
        var captions = Make("Section", "Pair", "Element", "Annotation lvl 4");
        AnnotationsController.PickDefaultCaption(captions, depth: 4).Should().BeNull();
        AnnotationsController.PickDefaultCaption(captions, depth: 7).Should().BeNull();
    }
}
