using CipherAnnotation.API.Extensions;
using CipherAnnotation.Core.DTOs.Annotation;
using CipherAnnotation.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CipherAnnotation.API.Controllers;

[ApiController]
[Authorize]
public class AnnotationsController : ControllerBase
{
    private readonly IAnnotationService _annotations;

    public AnnotationsController(IAnnotationService annotations)
    {
        _annotations = annotations;
    }

    [HttpGet("api/pages/{pageId:guid}/annotations")]
    public async Task<IActionResult> List(Guid pageId, CancellationToken ct = default)
    {
        var result = await _annotations.ListForPageAsync(pageId, User.GetUserId(), ct);
        return result.ToActionResult();
    }

    [HttpPost("api/pages/{pageId:guid}/annotations")]
    public async Task<IActionResult> Create(Guid pageId, [FromBody] CreateAnnotationRequest req, CancellationToken ct = default)
    {
        var result = await _annotations.CreateAsync(pageId, User.GetUserId(), req, ct);
        return result.ToCreatedResult();
    }

    [HttpPut("api/pages/{pageId:guid}/annotations/{id:guid}")]
    public async Task<IActionResult> Update(Guid pageId, Guid id, [FromBody] UpdateAnnotationRequest req, CancellationToken ct = default)
    {
        var result = await _annotations.UpdateAsync(pageId, id, User.GetUserId(), req, ct);
        return result.ToActionResult();
    }

    [HttpDelete("api/pages/{pageId:guid}/annotations/{id:guid}")]
    public async Task<IActionResult> Delete(Guid pageId, Guid id, CancellationToken ct = default)
    {
        var result = await _annotations.DeleteAsync(pageId, id, User.GetUserId(), ct);
        return result.ToActionResult();
    }

    [HttpPut("api/pages/{pageId:guid}/annotations/boundingboxes/{id:guid}")]
    public async Task<IActionResult> UpdateBoundingBox(Guid pageId, Guid id, [FromBody] BoundingBoxDto req, CancellationToken ct = default)
    {
        var result = await _annotations.UpdateBoundingBoxAsync(pageId, id, User.GetUserId(), req, ct);
        return result.ToActionResult();
    }

    [HttpGet("api/documents/{documentId:guid}/annotations")]
    public async Task<IActionResult> ListForDocument(
        Guid documentId,
        [FromQuery] string? type,
        [FromQuery] Guid? currentPageId,
        [FromQuery] Guid? parentId,
        [FromQuery] bool rootOnly = false,
        CancellationToken ct = default)
    {
        var result = await _annotations.ListForDocumentAsync(
            documentId, User.GetUserId(), type, currentPageId, parentId, rootOnly, ct);
        return result.ToActionResult();
    }

    [HttpPost("api/pages/{pageId:guid}/auto-annotate")]
    public async Task<IActionResult> AutoAnnotate(Guid pageId, CancellationToken ct = default)
    {
        var result = await _annotations.AutoAnnotateAsync(pageId, User.GetUserId(), ct);
        return result.ToActionResult();
    }

    [HttpPost("api/documents/{documentId:guid}/auto-annotate")]
    public async Task<IActionResult> AutoAnnotateAll(
        Guid documentId,
        [FromQuery] Guid? excludePageId,
        CancellationToken ct = default)
    {
        var result = await _annotations.AutoAnnotateAllAsync(documentId, User.GetUserId(), excludePageId, ct);
        return result.ToActionResult();
    }

}
