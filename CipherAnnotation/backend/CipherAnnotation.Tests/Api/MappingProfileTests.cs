using AutoMapper;
using CipherAnnotation.API.Mapping;
using CipherAnnotation.Core.DTOs.Annotation;
using CipherAnnotation.Core.DTOs.Auth;
using CipherAnnotation.Core.DTOs.Document;
using CipherAnnotation.Core.DTOs.Page;

namespace CipherAnnotation.Tests.Api;

public class MappingProfileTests
{
    private static IMapper NewMapper()
    {
        // Skipping AssertConfigurationIsValid: a handful of destination members
        // (e.g. PageDto.CanUndoPreprocess, DocumentDto.MyPermission) are filled
        // in by the controller layer rather than AutoMapper, so the profile is
        // intentionally not strict.
        var config = new MapperConfiguration(cfg => cfg.AddProfile<MappingProfile>());
        return config.CreateMapper();
    }

    [Fact]
    public void Configuration_Builds()
    {
        var act = () => NewMapper();
        act.Should().NotThrow();
    }

    [Fact]
    public void User_To_UserDto_CopiesFields()
    {
        var mapper = NewMapper();
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "u@example.com",
            Name = "Name",
            AvatarUri = "https://x/y.png",
            Role = UserRole.Admin,
            CreatedAt = new DateTime(2024, 1, 2, 3, 4, 5, DateTimeKind.Utc),
        };

        var dto = mapper.Map<UserDto>(user);

        dto.Id.Should().Be(user.Id);
        dto.Email.Should().Be(user.Email);
        dto.Name.Should().Be(user.Name);
        dto.AvatarUri.Should().Be(user.AvatarUri);
        dto.Role.Should().Be(user.Role);
        dto.CreatedAt.Should().Be(user.CreatedAt);
    }

    [Fact]
    public void Document_To_DocumentDto_StringifiesVisibilityAndCountsPages()
    {
        var mapper = NewMapper();
        var owner = new User { Id = Guid.NewGuid(), Email = "o@x", Name = "Owner" };
        var doc = new Document
        {
            Id = Guid.NewGuid(),
            Title = "T",
            OwnerId = owner.Id,
            Owner = owner,
            Visibility = Visibility.Public,
            Pages = new List<Page>
            {
                new() { Id = Guid.NewGuid(), DocumentId = Guid.NewGuid(), PageNumber = 1, ImageBlobId = Guid.NewGuid(), Width = 1, Height = 1, Orientation = 0, ResolutionDPI = 72 },
                new() { Id = Guid.NewGuid(), DocumentId = Guid.NewGuid(), PageNumber = 2, ImageBlobId = Guid.NewGuid(), Width = 1, Height = 1, Orientation = 0, ResolutionDPI = 72 },
            },
        };

        var dto = mapper.Map<DocumentDto>(doc);

        dto.Id.Should().Be(doc.Id);
        dto.Visibility.Should().Be("Public");
        dto.OwnerName.Should().Be("Owner");
        dto.PageCount.Should().Be(2);
    }

    [Fact]
    public void CreateDocumentRequest_To_Document_ParsesVisibility()
    {
        var mapper = NewMapper();
        var req = new CreateDocumentRequest { Title = "T", Visibility = "Public" };

        var doc = mapper.Map<Document>(req);

        doc.Title.Should().Be("T");
        doc.Visibility.Should().Be(Visibility.Public);
    }

    [Fact]
    public void UpdateDocumentRequest_To_Document_SkipsNullFields()
    {
        var mapper = NewMapper();
        var existing = new Document
        {
            Id = Guid.NewGuid(),
            Title = "Original",
            Description = "Original desc",
            Visibility = Visibility.Private,
            OwnerId = Guid.NewGuid(),
        };
        var update = new UpdateDocumentRequest { Title = "New" };

        mapper.Map(update, existing);

        existing.Title.Should().Be("New");
        existing.Description.Should().Be("Original desc");
        existing.Visibility.Should().Be(Visibility.Private);
    }

    [Fact]
    public void UpdateDocumentRequest_To_Document_AppliesVisibility()
    {
        var mapper = NewMapper();
        var existing = new Document { Id = Guid.NewGuid(), Title = "T", Visibility = Visibility.Private, OwnerId = Guid.NewGuid() };
        var update = new UpdateDocumentRequest { Visibility = "Public" };

        mapper.Map(update, existing);

        existing.Visibility.Should().Be(Visibility.Public);
    }

    [Fact]
    public void Page_To_PageDto_BuildsImageUrls()
    {
        var mapper = NewMapper();
        var docId = Guid.NewGuid();
        var page = new Page
        {
            Id = Guid.NewGuid(),
            DocumentId = docId,
            PageNumber = 3,
            ImageBlobId = Guid.NewGuid(),
            Width = 800,
            Height = 600,
            Orientation = 0,
            ResolutionDPI = 96,
            ProcessedImageBlobId = Guid.NewGuid(),
        };

        var dto = mapper.Map<PageDto>(page);

        dto.ImageUrl.Should().Be($"/documents/{docId}/pages/{page.Id}/image");
        dto.ProcessedImageUrl.Should().Be($"/documents/{docId}/pages/{page.Id}/processed-image");
    }

    [Fact]
    public void Page_To_PageDto_NullProcessedBlob_NullProcessedUrl()
    {
        var mapper = NewMapper();
        var page = new Page
        {
            Id = Guid.NewGuid(),
            DocumentId = Guid.NewGuid(),
            PageNumber = 1,
            ImageBlobId = Guid.NewGuid(),
            Width = 1,
            Height = 1,
            Orientation = 0,
            ResolutionDPI = 72,
            ProcessedImageBlobId = null,
        };

        mapper.Map<PageDto>(page).ProcessedImageUrl.Should().BeNull();
    }

    [Fact]
    public void Annotation_To_AnnotationDto_StringifiesTypeAndIgnoresCaptionFields()
    {
        var mapper = NewMapper();
        var ann = new Annotation
        {
            Id = Guid.NewGuid(),
            PageId = Guid.NewGuid(),
            CaptionId = Guid.NewGuid(),
            Type = AnnotationType.Cipher,
            Orientation = 0,
            BoundingBox = new BoundingBox { X = 1, Y = 2, Width = 3, Height = 4 },
        };

        var dto = mapper.Map<AnnotationDto>(ann);

        dto.Type.Should().Be("Cipher");
        dto.BoundingBox!.X.Should().Be(1);
        // CaptionName/CaptionNumber are populated by the controller, not AutoMapper —
        // here they fall back to type defaults.
        dto.CaptionName.Should().BeNull();
        dto.CaptionNumber.Should().Be(0);
    }
}
