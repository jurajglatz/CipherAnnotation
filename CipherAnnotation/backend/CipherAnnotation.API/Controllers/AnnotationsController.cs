using System.Security.Claims;
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
        var result = await _annotations.ListForPageAsync(pageId, GetCurrentUserId(), ct);
        return result.ToActionResult();
    }

    [HttpPost("api/pages/{pageId:guid}/annotations")]
    public async Task<IActionResult> Create(Guid pageId, [FromBody] CreateAnnotationRequest req, CancellationToken ct = default)
    {
        var result = await _annotations.CreateAsync(pageId, GetCurrentUserId(), req, ct);
        return result.ToCreatedResult();
    }

    [HttpPut("api/pages/{pageId:guid}/annotations/{id:guid}")]
    public async Task<IActionResult> Update(Guid pageId, Guid id, [FromBody] UpdateAnnotationRequest req, CancellationToken ct = default)
    {
        var result = await _annotations.UpdateAsync(pageId, id, GetCurrentUserId(), req, ct);
        return result.ToActionResult();
    }

    [HttpDelete("api/pages/{pageId:guid}/annotations/{id:guid}")]
    public async Task<IActionResult> Delete(Guid pageId, Guid id, CancellationToken ct = default)
    {
        var result = await _annotations.DeleteAsync(pageId, id, GetCurrentUserId(), ct);
        return result.ToActionResult();
    }

    [HttpPut("api/pages/{pageId:guid}/annotations/boundingboxes/{id:guid}")]
    public async Task<IActionResult> UpdateBoundingBox(Guid pageId, Guid id, [FromBody] BoundingBoxDto req, CancellationToken ct = default)
    {
        var result = await _annotations.UpdateBoundingBoxAsync(pageId, id, GetCurrentUserId(), req, ct);
        return result.ToActionResult();
    }

    [HttpGet("api/documents/{documentId:guid}/annotations")]
    public async Task<IActionResult> ListForDocument(
        Guid documentId,
        [FromQuery] string? type,
        [FromQuery] Guid? currentPageId,
        CancellationToken ct = default)
    {
        var result = await _annotations.ListForDocumentAsync(documentId, GetCurrentUserId(), type, currentPageId, ct);
        return result.ToActionResult();
    }

    [HttpPost("api/pages/{pageId:guid}/auto-annotate")]
    public async Task<IActionResult> AutoAnnotate(Guid pageId, CancellationToken ct = default)
    {
        var result = await _annotations.AutoAnnotateAsync(pageId, GetCurrentUserId(), ct);
        return result.ToActionResult();
    }

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(userIdClaim, out var userId) ? userId : Guid.Empty;
    }
}
