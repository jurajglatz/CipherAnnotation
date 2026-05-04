using AutoMapper;
using CipherAnnotation.Core.DTOs.Caption;
using CipherAnnotation.Core.Entities;
using CipherAnnotation.Core.Enums;
using CipherAnnotation.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace CipherAnnotation.API.Controllers;

[ApiController]
[Authorize]
[Route("api/documents/{documentId:guid}/captions")]
public class CaptionsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IMapper _mapper;

    public CaptionsController(AppDbContext db, IMapper mapper)
    {
        _db = db;
        _mapper = mapper;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<CaptionDto>>> List(Guid documentId)
    {
        if (!await UserCanAccessDocument(documentId)) return Forbid();

        var captions = await _db.Captions
            .Where(c => c.DocumentId == documentId)
            .OrderBy(c => c.CreatedAt)
            .ToListAsync();

        var counts = await _db.Annotations
            .Where(a => a.Page!.DocumentId == documentId)
            .GroupBy(a => a.CaptionId)
            .Select(g => new { CaptionId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.CaptionId, g => g.Count);

        return Ok(captions.Select(c =>
        {
            var dto = _mapper.Map<CaptionDto>(c);
            return dto with { UsageCount = counts.GetValueOrDefault(c.Id, 0) };
        }));
    }

    [HttpPost]
    public async Task<ActionResult<CaptionDto>> Create(Guid documentId, CreateCaptionRequest req)
    {
        if (!await UserCanAccessDocument(documentId)) return Forbid();

        var name = req.Name.Trim();
        if (await _db.Captions.AnyAsync(c => c.DocumentId == documentId && c.Name == name))
            return Conflict(new { message = $"A caption named \"{name}\" already exists." });

        var caption = new Caption { DocumentId = documentId, Name = name };
        _db.Captions.Add(caption);
        await _db.SaveChangesAsync();

        var dto = _mapper.Map<CaptionDto>(caption) with { UsageCount = 0 };
        return CreatedAtAction(nameof(List), new { documentId }, dto);
    }

    [HttpPut("{captionId:guid}")]
    public async Task<ActionResult<CaptionDto>> Rename(Guid documentId, Guid captionId, UpdateCaptionRequest req)
    {
        if (!await UserCanAccessDocument(documentId)) return Forbid();

        var caption = await _db.Captions.FirstOrDefaultAsync(c => c.Id == captionId && c.DocumentId == documentId);
        if (caption is null) return NotFound();

        var name = req.Name.Trim();
        if (await _db.Captions.AnyAsync(c => c.DocumentId == documentId && c.Name == name && c.Id != captionId))
            return Conflict(new { message = $"A caption named \"{name}\" already exists." });

        caption.Name = name;
        await _db.SaveChangesAsync();

        var usage = await _db.Annotations.CountAsync(a => a.CaptionId == captionId);
        return Ok(_mapper.Map<CaptionDto>(caption) with { UsageCount = usage });
    }

    [HttpDelete("{captionId:guid}")]
    public async Task<IActionResult> Delete(Guid documentId, Guid captionId)
    {
        if (!await UserCanAccessDocument(documentId)) return Forbid();

        var caption = await _db.Captions.FirstOrDefaultAsync(c => c.Id == captionId && c.DocumentId == documentId);
        if (caption is null) return NotFound();

        var inUse = await _db.Annotations.AnyAsync(a => a.CaptionId == captionId);
        if (inUse)
        {
            var n = await _db.Annotations.CountAsync(a => a.CaptionId == captionId);
            return Conflict(new { message = $"Cannot delete caption \"{caption.Name}\" — {n} annotation(s) still use it." });
        }

        _db.Captions.Remove(caption);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    private async Task<bool> UserCanAccessDocument(Guid documentId)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        return await _db.Documents.AnyAsync(d =>
            d.Id == documentId &&
            (d.OwnerId == userId
             || d.Visibility == Visibility.Public
             || d.Shares.Any(s => s.UserId == userId)));
    }
}
