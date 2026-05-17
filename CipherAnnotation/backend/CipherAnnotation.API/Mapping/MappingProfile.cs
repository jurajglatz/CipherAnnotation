using AutoMapper;
using CipherAnnotation.Core.DTOs.Annotation;
using CipherAnnotation.Core.DTOs.Auth;
using CipherAnnotation.Core.DTOs.Caption;
using CipherAnnotation.Core.DTOs.Document;
using CipherAnnotation.Core.DTOs.Export;
using CipherAnnotation.Core.DTOs.Page;
using CipherAnnotation.Core.Entities;
using CipherAnnotation.Core.Enums;

namespace CipherAnnotation.API.Mapping;

/// <summary>
/// AutoMapper profile for mapping between entities and data transfer objects.
/// </summary>
public class MappingProfile : Profile
{
    /// <summary>
    /// Initializes a new instance of the MappingProfile class and configures all mappings.
    /// </summary>
    public MappingProfile()
    {
        // Auth mappings
        MapAuthDtos();

        // Document mappings
        MapDocumentDtos();

        // Page mappings
        MapPageDtos();

        // Annotation mappings
        MapAnnotationDtos();

        // Export mappings
        MapExportDtos();
    }

    /// <summary>
    /// Configures authentication-related mappings.
    /// </summary>
    private void MapAuthDtos()
    {
        // User to UserDto
        CreateMap<User, UserDto>()
            .ForMember(dest => dest.Id, opt => opt.MapFrom(src => src.Id))
            .ForMember(dest => dest.Email, opt => opt.MapFrom(src => src.Email))
            .ForMember(dest => dest.Name, opt => opt.MapFrom(src => src.Name))
            .ForMember(dest => dest.AvatarUri, opt => opt.MapFrom(src => src.AvatarUri));
    }

    /// <summary>
    /// Configures document-related mappings.
    /// </summary>
    private void MapDocumentDtos()
    {
        // Document to DocumentDto
        CreateMap<Document, DocumentDto>()
            .ForMember(dest => dest.Id, opt => opt.MapFrom(src => src.Id))
            .ForMember(dest => dest.Title, opt => opt.MapFrom(src => src.Title))
            .ForMember(dest => dest.Description, opt => opt.MapFrom(src => src.Description))
            .ForMember(dest => dest.OriginCountry, opt => opt.MapFrom(src => src.OriginCountry))
            .ForMember(dest => dest.Author, opt => opt.MapFrom(src => src.Author))
            .ForMember(dest => dest.Language, opt => opt.MapFrom(src => src.Language))
            .ForMember(dest => dest.Visibility, opt => opt.MapFrom(src => src.Visibility.ToString()))
            .ForMember(dest => dest.OwnerId, opt => opt.MapFrom(src => src.OwnerId))
            .ForMember(dest => dest.OwnerName, opt => opt.MapFrom(src => src.Owner!.Name))
            .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(src => src.CreatedAt))
            .ForMember(dest => dest.UpdatedAt, opt => opt.MapFrom(src => src.UpdatedAt))
            .ForMember(dest => dest.PageCount, opt => opt.MapFrom(src => src.Pages.Count))
            .ForMember(dest => dest.MyPermission, opt => opt.Ignore());

        // CreateDocumentRequest to Document
        CreateMap<CreateDocumentRequest, Document>()
            .ForMember(dest => dest.Title, opt => opt.MapFrom(src => src.Title))
            .ForMember(dest => dest.Description, opt => opt.MapFrom(src => src.Description))
            .ForMember(dest => dest.OriginCountry, opt => opt.MapFrom(src => src.OriginCountry))
            .ForMember(dest => dest.Author, opt => opt.MapFrom(src => src.Author))
            .ForMember(dest => dest.Language, opt => opt.MapFrom(src => src.Language))
            .ForMember(dest => dest.Visibility, opt => opt.MapFrom(src =>
                Enum.Parse<Visibility>(src.Visibility)))
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.OwnerId, opt => opt.Ignore())
            .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
            .ForMember(dest => dest.UpdatedAt, opt => opt.Ignore())
            .ForMember(dest => dest.Owner, opt => opt.Ignore())
            .ForMember(dest => dest.Pages, opt => opt.Ignore())
            .ForMember(dest => dest.Shares, opt => opt.Ignore());

        // UpdateDocumentRequest to Document
        CreateMap<UpdateDocumentRequest, Document>()
            .ForMember(dest => dest.Title, opt => opt.Condition((src, dest) => src.Title != null))
            .ForMember(dest => dest.Description, opt => opt.Condition((src, dest) => src.Description != null))
            .ForMember(dest => dest.OriginCountry, opt => opt.Condition((src, dest) => src.OriginCountry != null))
            .ForMember(dest => dest.Author, opt => opt.Condition((src, dest) => src.Author != null))
            .ForMember(dest => dest.Language, opt => opt.Condition((src, dest) => src.Language != null))
            .ForMember(dest => dest.Visibility, opt => opt.Condition((src, dest) => src.Visibility != null))
            .ForMember(dest => dest.Visibility, opt => opt.MapFrom(src =>
                src.Visibility == null ? Visibility.Private : Enum.Parse<Visibility>(src.Visibility)))
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.OwnerId, opt => opt.Ignore())
            .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
            .ForMember(dest => dest.UpdatedAt, opt => opt.Ignore())
            .ForMember(dest => dest.Owner, opt => opt.Ignore())
            .ForMember(dest => dest.Pages, opt => opt.Ignore())
            .ForMember(dest => dest.Shares, opt => opt.Ignore());

        // DocumentShare to DocumentShareDto
        CreateMap<DocumentShare, DocumentShareDto>()
            .ForMember(dest => dest.Id, opt => opt.MapFrom(src => src.Id))
            .ForMember(dest => dest.DocumentId, opt => opt.MapFrom(src => src.DocumentId))
            .ForMember(dest => dest.UserId, opt => opt.MapFrom(src => src.UserId))
            .ForMember(dest => dest.UserEmail, opt => opt.MapFrom(src => src.User!.Email))
            .ForMember(dest => dest.Permission, opt => opt.MapFrom(src => src.Permission.ToString()))
            .ForMember(dest => dest.SharedAt, opt => opt.MapFrom(src => src.SharedAt));
    }

    /// <summary>
    /// Configures page-related mappings.
    /// </summary>
    private void MapPageDtos()
    {
        // Page to PageDto
        CreateMap<Page, PageDto>()
            .ForMember(dest => dest.Id, opt => opt.MapFrom(src => src.Id))
            .ForMember(dest => dest.DocumentId, opt => opt.MapFrom(src => src.DocumentId))
            .ForMember(dest => dest.PageNumber, opt => opt.MapFrom(src => src.PageNumber))
            .ForMember(dest => dest.ImageUrl, opt => opt.MapFrom(src => $"/documents/{src.DocumentId}/pages/{src.Id}/image"))
            .ForMember(dest => dest.ProcessedImageUrl, opt => opt.MapFrom(src =>
                src.ProcessedImageBlobId.HasValue
                    ? $"/documents/{src.DocumentId}/pages/{src.Id}/processed-image"
                    : null))
            .ForMember(dest => dest.Width, opt => opt.MapFrom(src => src.Width))
            .ForMember(dest => dest.Height, opt => opt.MapFrom(src => src.Height))
            .ForMember(dest => dest.Orientation, opt => opt.MapFrom(src => src.Orientation))
            .ForMember(dest => dest.ResolutionDPI, opt => opt.MapFrom(src => src.ResolutionDPI))
            .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(src => src.CreatedAt));
    }

    /// <summary>
    /// Configures annotation-related mappings.
    /// </summary>
    private void MapAnnotationDtos()
    {
        // BoundingBox <-> BoundingBoxDto.
        CreateMap<BoundingBox, BoundingBoxDto>();
        CreateMap<BoundingBoxDto, BoundingBox>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.AnnotationId, opt => opt.Ignore())
            .ForMember(dest => dest.Annotation, opt => opt.Ignore());

        // Annotation -> AnnotationDto.
        // CaptionName, CaptionNumber are populated by the controller (not via AutoMapper)
        // because they require cross-row context (creation-order sort + grouping).
        CreateMap<Annotation, AnnotationDto>()
            .ForMember(dest => dest.Type, opt => opt.MapFrom(src => src.Type.ToString()))
            .ForMember(dest => dest.BoundingBox, opt => opt.MapFrom(src => src.BoundingBox))
            .ForMember(dest => dest.CaptionName, opt => opt.Ignore())
            .ForMember(dest => dest.CaptionNumber, opt => opt.Ignore());

        // Caption -> CaptionDto. UsageCount is populated by the controller.
        CreateMap<Caption, CaptionDto>()
            .ForMember(dest => dest.UsageCount, opt => opt.Ignore());
    }

    /// <summary>
    /// Configures export-related mappings.
    /// </summary>
    private void MapExportDtos()
    {
        // ExportRequest does not map to any entity; it's used as input
        // ExportResponse does not map from any entity; it's created manually in the service
    }
}
