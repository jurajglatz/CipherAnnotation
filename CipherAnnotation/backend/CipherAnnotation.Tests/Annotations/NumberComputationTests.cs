using CipherAnnotation.API.Controllers;

namespace CipherAnnotation.Tests.Annotations;

public class NumberComputationTests
{
    [Fact]
    public void ComputeNumbers_OrdersByCreatedAtAscending_PerCaptionPerPage()
    {
        var pageA = Guid.NewGuid();
        var pageB = Guid.NewGuid();
        var capX = Guid.NewGuid();
        var capY = Guid.NewGuid();

        var t0 = new DateTime(2026, 4, 27, 10, 0, 0, DateTimeKind.Utc);
        var anns = new[]
        {
            new Annotation { Id = Guid.NewGuid(), PageId = pageA, CaptionId = capX, Type = AnnotationType.Text, Orientation = 0, CreatedAt = t0.AddMinutes(2) },
            new Annotation { Id = Guid.NewGuid(), PageId = pageA, CaptionId = capX, Type = AnnotationType.Text, Orientation = 0, CreatedAt = t0 },
            new Annotation { Id = Guid.NewGuid(), PageId = pageA, CaptionId = capY, Type = AnnotationType.Text, Orientation = 0, CreatedAt = t0.AddMinutes(1) },
            new Annotation { Id = Guid.NewGuid(), PageId = pageB, CaptionId = capX, Type = AnnotationType.Text, Orientation = 0, CreatedAt = t0 },
        };

        var numbers = AnnotationsController.ComputeCaptionNumbers(anns);

        numbers[anns[1].Id].Should().Be(1);
        numbers[anns[0].Id].Should().Be(2);
        numbers[anns[2].Id].Should().Be(1);
        numbers[anns[3].Id].Should().Be(1);
    }

    [Fact]
    public void ComputeNumbers_ClosesGapsAfterDelete()
    {
        var pageA = Guid.NewGuid();
        var capX = Guid.NewGuid();
        var t0 = DateTime.UtcNow;

        var first = new Annotation { Id = Guid.NewGuid(), PageId = pageA, CaptionId = capX, Type = AnnotationType.Text, Orientation = 0, CreatedAt = t0 };
        var third = new Annotation { Id = Guid.NewGuid(), PageId = pageA, CaptionId = capX, Type = AnnotationType.Text, Orientation = 0, CreatedAt = t0.AddMinutes(2) };

        var numbers = AnnotationsController.ComputeCaptionNumbers(new[] { first, third });

        numbers[first.Id].Should().Be(1);
        numbers[third.Id].Should().Be(2);
    }
}
