using AutoMapper;
using CipherAnnotation.Core.DTOs.Annotation;
using CipherAnnotation.Core.DTOs.Auth;
using CipherAnnotation.Core.DTOs.Document;
using CipherAnnotation.Core.DTOs.Export;
using CipherAnnotation.Core.DTOs.Page;
using CipherAnnotation.Core.DTOs.Symbol;
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

        // Symbol mappings
        MapSymbolDtos();

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
            .ForMember(dest => dest.PageCount, opt => opt.MapFrom(src => src.Pages.Count));

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
        // BoundingBox to BoundingBoxDto
        CreateMap<BoundingBox, BoundingBoxDto>()
            .ForMember(dest => dest.X, opt => opt.MapFrom(src => src.X))
            .ForMember(dest => dest.Y, opt => opt.MapFrom(src => src.Y))
            .ForMember(dest => dest.Width, opt => opt.MapFrom(src => src.Width))
            .ForMember(dest => dest.Height, opt => opt.MapFrom(src => src.Height));

        // BoundingBoxDto to BoundingBox
        CreateMap<BoundingBoxDto, BoundingBox>()
            .ForMember(dest => dest.X, opt => opt.MapFrom(src => src.X))
            .ForMember(dest => dest.Y, opt => opt.MapFrom(src => src.Y))
            .ForMember(dest => dest.Width, opt => opt.MapFrom(src => src.Width))
            .ForMember(dest => dest.Height, opt => opt.MapFrom(src => src.Height))
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.SectionId, opt => opt.Ignore())
            .ForMember(dest => dest.PairId, opt => opt.Ignore())
            .ForMember(dest => dest.ElementId, opt => opt.Ignore())
            .ForMember(dest => dest.Section, opt => opt.Ignore())
            .ForMember(dest => dest.Pair, opt => opt.Ignore())
            .ForMember(dest => dest.Element, opt => opt.Ignore());

        // SectionAnnotation to SectionAnnotationDto
        CreateMap<SectionAnnotation, SectionAnnotationDto>()
            .ForMember(dest => dest.Id, opt => opt.MapFrom(src => src.Id))
            .ForMember(dest => dest.PageId, opt => opt.MapFrom(src => src.PageId))
            .ForMember(dest => dest.Label, opt => opt.MapFrom(src => src.Label))
            .ForMember(dest => dest.Orientation, opt => opt.MapFrom(src => src.Orientation))
            .ForMember(dest => dest.BoundingBox, opt => opt.MapFrom(src => src.BoundingBox))
            .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(src => src.CreatedAt))
            .ForMember(dest => dest.PairAnnotations, opt => opt.MapFrom(src => src.PairAnnotations));

        // CreateSectionRequest to SectionAnnotation
        CreateMap<CreateSectionRequest, SectionAnnotation>()
            .ForMember(dest => dest.Label, opt => opt.MapFrom(src => src.Label))
            .ForMember(dest => dest.Orientation, opt => opt.MapFrom(src => src.Orientation))
            .ForMember(dest => dest.BoundingBox, opt => opt.MapFrom(src => src.BoundingBox))
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.PageId, opt => opt.Ignore())
            .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
            .ForMember(dest => dest.Page, opt => opt.Ignore())
            .ForMember(dest => dest.PairAnnotations, opt => opt.Ignore());

        // PairAnnotation to PairAnnotationDto
        CreateMap<PairAnnotation, PairAnnotationDto>()
            .ForMember(dest => dest.Id, opt => opt.MapFrom(src => src.Id))
            .ForMember(dest => dest.SectionId, opt => opt.MapFrom(src => src.SectionId))
            .ForMember(dest => dest.Order, opt => opt.MapFrom(src => src.Order))
            .ForMember(dest => dest.Orientation, opt => opt.MapFrom(src => src.Orientation))
            .ForMember(dest => dest.BoundingBox, opt => opt.MapFrom(src => src.BoundingBox))
            .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(src => src.CreatedAt))
            .ForMember(dest => dest.ElementAnnotations, opt => opt.MapFrom(src => src.ElementAnnotations));

        // CreatePairRequest to PairAnnotation
        CreateMap<CreatePairRequest, PairAnnotation>()
            .ForMember(dest => dest.Order, opt => opt.MapFrom(src => src.Order))
            .ForMember(dest => dest.Orientation, opt => opt.MapFrom(src => src.Orientation))
            .ForMember(dest => dest.BoundingBox, opt => opt.MapFrom(src => src.BoundingBox))
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.SectionId, opt => opt.Ignore())
            .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
            .ForMember(dest => dest.Section, opt => opt.Ignore())
            .ForMember(dest => dest.ElementAnnotations, opt => opt.Ignore());

        // ElementAnnotation to ElementAnnotationDto
        CreateMap<ElementAnnotation, ElementAnnotationDto>()
            .ForMember(dest => dest.Id, opt => opt.MapFrom(src => src.Id))
            .ForMember(dest => dest.PairId, opt => opt.MapFrom(src => src.PairId))
            .ForMember(dest => dest.SymbolId, opt => opt.MapFrom(src => src.SymbolId))
            .ForMember(dest => dest.Type, opt => opt.MapFrom(src => src.Type.ToString()))
            .ForMember(dest => dest.Content, opt => opt.MapFrom(src => src.Content))
            .ForMember(dest => dest.Transcription, opt => opt.MapFrom(src => src.Transcription))
            .ForMember(dest => dest.Orientation, opt => opt.MapFrom(src => src.Orientation))
            .ForMember(dest => dest.BoundingBox, opt => opt.MapFrom(src => src.BoundingBox))
            .ForMember(dest => dest.SymbolCode, opt => opt.MapFrom(src => src.Symbol!.Code))
            .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(src => src.CreatedAt));

        // CreateElementRequest to ElementAnnotation
        CreateMap<CreateElementRequest, ElementAnnotation>()
            .ForMember(dest => dest.SymbolId, opt => opt.MapFrom(src => src.SymbolId))
            .ForMember(dest => dest.Type, opt => opt.MapFrom(src =>
                Enum.Parse<ElementType>(src.Type)))
            .ForMember(dest => dest.Content, opt => opt.MapFrom(src => src.Content))
            .ForMember(dest => dest.Transcription, opt => opt.MapFrom(src => src.Transcription))
            .ForMember(dest => dest.Orientation, opt => opt.MapFrom(src => src.Orientation))
            .ForMember(dest => dest.BoundingBox, opt => opt.MapFrom(src => src.BoundingBox))
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.PairId, opt => opt.Ignore())
            .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
            .ForMember(dest => dest.Pair, opt => opt.Ignore())
            .ForMember(dest => dest.Symbol, opt => opt.Ignore());
    }

    /// <summary>
    /// Configures symbol-related mappings.
    /// </summary>
    private void MapSymbolDtos()
    {
        // Symbol to SymbolDto
        CreateMap<Symbol, SymbolDto>()
            .ForMember(dest => dest.Id, opt => opt.MapFrom(src => src.Id))
            .ForMember(dest => dest.Code, opt => opt.MapFrom(src => src.Code))
            .ForMember(dest => dest.PreviewImageUrl, opt => opt.MapFrom(src =>
                src.PreviewImageBlobId.HasValue ? $"/api/symbols/{src.Id}/image" : null))
            .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(src => src.CreatedAt));

        // CreateSymbolRequest to Symbol
        CreateMap<CreateSymbolRequest, Symbol>()
            .ForMember(dest => dest.Code, opt => opt.MapFrom(src => src.Code))
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.PreviewImageBlobId, opt => opt.Ignore())
            .ForMember(dest => dest.PreviewImageBlob, opt => opt.Ignore())
            .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
            .ForMember(dest => dest.Elements, opt => opt.Ignore());
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
