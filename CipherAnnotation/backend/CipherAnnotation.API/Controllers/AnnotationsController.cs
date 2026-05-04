using AutoMapper;
using CipherAnnotation.Core.DTOs.Annotation;
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
public class AnnotationsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IMapper _mapper;

    public AnnotationsController(AppDbContext db, IMapper mapper)
    {
        _db = db;
        _mapper = mapper;
    }

    [HttpGet("api/pages/{pageId:guid}/annotations")]
    public async Task<ActionResult<IEnumerable<AnnotationDto>>> List(Guid pageId)
    {
        if (!await UserCanAccessPage(pageId)) return Forbid();

        var anns = await _db.Annotations
            .Where(a => a.PageId == pageId)
            .Include(a => a.BoundingBox)
            .Include(a => a.Caption)
            .ToListAsync();

        var numbers = ComputeCaptionNumbers(anns);

        return Ok(anns.Select(a =>
        {
            var dto = _mapper.Map<AnnotationDto>(a);
            return dto with
            {
                CaptionName = a.Caption!.Name,
                CaptionNumber = numbers[a.Id],
            };
        }));
    }

    [HttpPost("api/pages/{pageId:guid}/annotations")]
    public async Task<ActionResult<AnnotationDto>> Create(Guid pageId, CreateAnnotationRequest req)
    {
        if (!await UserCanAccessPage(pageId)) return Forbid();

        if (!Enum.TryParse<AnnotationType>(req.Type, ignoreCase: false, out var type))
            return BadRequest(new { message = $"Invalid type \"{req.Type}\"." });

        if (!ValidateTypeFields(type, req.Transcription, req.TranscriptionRefId, out var typeError))
            return BadRequest(new { message = typeError });

        var page = await _db.Pages.FirstOrDefaultAsync(p => p.Id == pageId);
        if (page is null) return NotFound();

        if (req.ParentId is { } parentId)
        {
            var parentPageId = await _db.Annotations
                .Where(a => a.Id == parentId)
                .Select(a => (Guid?)a.PageId)
                .FirstOrDefaultAsync();
            if (parentPageId is null || parentPageId != pageId)
                return BadRequest(new { message = "Parent annotation must be on the same page." });
        }

        if (type == AnnotationType.Symbol && req.TranscriptionRefId is { } refId)
        {
            var ok = await _db.Annotations.AnyAsync(a =>
                a.Id == refId &&
                a.Type == AnnotationType.Text &&
                a.Page!.DocumentId == page.DocumentId);
            if (!ok)
                return BadRequest(new { message = "transcriptionRefId must point to a Text annotation in the same document." });
        }

        var depth = await ComputeDepth(req.ParentId);
        var documentCaptions = await _db.Captions
            .Where(c => c.DocumentId == page.DocumentId)
            .ToListAsync();

        Caption? caption;
        if (req.CaptionId is { } cid)
        {
            caption = documentCaptions.FirstOrDefault(c => c.Id == cid);
            if (caption is null) return BadRequest(new { message = "captionId is not a caption of this document." });
        }
        else
        {
            caption = PickDefaultCaption(documentCaptions, depth);
            if (caption is null)
            {
                var levelN = depth + 1;
                while (documentCaptions.Any(c => c.Name == $"Annotation lvl {levelN}")) levelN++;
                caption = new Caption { DocumentId = page.DocumentId, Name = $"Annotation lvl {levelN}" };
                _db.Captions.Add(caption);
                await _db.SaveChangesAsync();
            }
        }

        var ann = new Annotation
        {
            PageId = pageId,
            ParentId = req.ParentId,
            CaptionId = caption.Id,
            Type = type,
            Content = req.Content,
            Transcription = type == AnnotationType.Cipher ? req.Transcription : null,
            TranscriptionRefId = type == AnnotationType.Symbol ? req.TranscriptionRefId : null,
            Orientation = req.Orientation,
            BoundingBox = new BoundingBox
            {
                X = req.BoundingBox.X,
                Y = req.BoundingBox.Y,
                Width = req.BoundingBox.Width,
                Height = req.BoundingBox.Height,
            },
        };
        _db.Annotations.Add(ann);
        await _db.SaveChangesAsync();

        await _db.Entry(ann).Reference(a => a.Caption).LoadAsync();
        await _db.Entry(ann).Reference(a => a.BoundingBox).LoadAsync();

        var pageAnns = await _db.Annotations.Where(a => a.PageId == pageId).ToListAsync();
        var numbers = ComputeCaptionNumbers(pageAnns);

        var dto = _mapper.Map<AnnotationDto>(ann) with
        {
            CaptionName = ann.Caption!.Name,
            CaptionNumber = numbers[ann.Id],
        };
        return CreatedAtAction(nameof(List), new { pageId }, dto);
    }

    [HttpPut("api/pages/{pageId:guid}/annotations/{id:guid}")]
    public async Task<ActionResult<AnnotationDto>> Update(Guid pageId, Guid id, UpdateAnnotationRequest req)
    {
        if (!await UserCanAccessPage(pageId)) return Forbid();

        var ann = await _db.Annotations
            .Include(a => a.BoundingBox)
            .FirstOrDefaultAsync(a => a.Id == id && a.PageId == pageId);
        if (ann is null) return NotFound();

        var page = await _db.Pages.FirstAsync(p => p.Id == pageId);

        if (req.ParentId.HasValue)
        {
            var newParentId = req.ParentId.Value;
            if (newParentId == id)
                return BadRequest(new { message = "An annotation cannot be its own parent." });
            if (newParentId != Guid.Empty)
            {
                var sameSide = await _db.Annotations.AnyAsync(a => a.Id == newParentId && a.PageId == pageId);
                if (!sameSide) return BadRequest(new { message = "Parent must be on the same page." });
                if (await IsDescendant(newParentId, id))
                    return BadRequest(new { message = "Reparenting would create a cycle." });
                ann.ParentId = newParentId;
            }
            else
            {
                ann.ParentId = null;
            }
        }

        if (req.CaptionId is { } cid)
        {
            var ok = await _db.Captions.AnyAsync(c => c.Id == cid && c.DocumentId == page.DocumentId);
            if (!ok) return BadRequest(new { message = "captionId is not a caption of this document." });
            ann.CaptionId = cid;
        }

        var newType = ann.Type;
        if (req.Type is not null)
        {
            if (!Enum.TryParse<AnnotationType>(req.Type, out newType))
                return BadRequest(new { message = $"Invalid type \"{req.Type}\"." });

            if (ann.Type == AnnotationType.Text && newType == AnnotationType.Symbol)
            {
                var refCount = await _db.Annotations.CountAsync(a => a.TranscriptionRefId == ann.Id);
                if (refCount > 0)
                    return Conflict(new { message = $"Cannot change to Symbol while {refCount} annotation(s) reference this as their plaintext." });
            }
            ann.Type = newType;
        }

        if (req.Content is not null) ann.Content = req.Content;

        if (req.Type is not null)
        {
            ann.Transcription = newType == AnnotationType.Cipher ? req.Transcription ?? ann.Transcription : null;
            ann.TranscriptionRefId = newType == AnnotationType.Symbol ? req.TranscriptionRefId ?? ann.TranscriptionRefId : null;
        }
        else
        {
            if (ann.Type == AnnotationType.Cipher && req.Transcription is not null) ann.Transcription = req.Transcription;
            if (ann.Type == AnnotationType.Symbol && req.TranscriptionRefId.HasValue)
            {
                var refId = req.TranscriptionRefId.Value;
                if (refId == Guid.Empty)
                {
                    ann.TranscriptionRefId = null;
                }
                else
                {
                    var ok = await _db.Annotations.AnyAsync(a =>
                        a.Id == refId &&
                        a.Type == AnnotationType.Text &&
                        a.Page!.DocumentId == page.DocumentId);
                    if (!ok) return BadRequest(new { message = "transcriptionRefId must point to a Text annotation in the same document." });
                    ann.TranscriptionRefId = refId;
                }
            }
        }

        if (!ValidateTypeFields(ann.Type, ann.Transcription, ann.TranscriptionRefId, out var typeError))
            return BadRequest(new { message = typeError });

        if (req.Orientation.HasValue) ann.Orientation = req.Orientation.Value;

        if (req.BoundingBox is { } bb && ann.BoundingBox is not null)
        {
            ann.BoundingBox.X = bb.X;
            ann.BoundingBox.Y = bb.Y;
            ann.BoundingBox.Width = bb.Width;
            ann.BoundingBox.Height = bb.Height;
        }

        await _db.SaveChangesAsync();
        await _db.Entry(ann).Reference(a => a.Caption).LoadAsync();

        var pageAnns = await _db.Annotations.Where(a => a.PageId == pageId).ToListAsync();
        var numbers = ComputeCaptionNumbers(pageAnns);

        return Ok(_mapper.Map<AnnotationDto>(ann) with
        {
            CaptionName = ann.Caption!.Name,
            CaptionNumber = numbers[ann.Id],
        });
    }

    [HttpDelete("api/pages/{pageId:guid}/annotations/{id:guid}")]
    public async Task<IActionResult> Delete(Guid pageId, Guid id)
    {
        if (!await UserCanAccessPage(pageId)) return Forbid();

        var ann = await _db.Annotations.FirstOrDefaultAsync(a => a.Id == id && a.PageId == pageId);
        if (ann is null) return NotFound();

        _db.Annotations.Remove(ann);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("api/pages/{pageId:guid}/annotations/boundingboxes/{id:guid}")]
    public async Task<ActionResult<BoundingBoxDto>> UpdateBoundingBox(Guid pageId, Guid id, BoundingBoxDto req)
    {
        if (!await UserCanAccessPage(pageId)) return Forbid();

        var ann = await _db.Annotations
            .Include(a => a.BoundingBox)
            .FirstOrDefaultAsync(a => a.Id == id && a.PageId == pageId);
        if (ann is null || ann.BoundingBox is null) return NotFound();

        ann.BoundingBox.X = req.X;
        ann.BoundingBox.Y = req.Y;
        ann.BoundingBox.Width = req.Width;
        ann.BoundingBox.Height = req.Height;
        await _db.SaveChangesAsync();

        return Ok(_mapper.Map<BoundingBoxDto>(ann.BoundingBox));
    }

    [HttpGet("api/documents/{documentId:guid}/annotations")]
    public async Task<ActionResult<IEnumerable<object>>> ListForDocument(
        Guid documentId,
        [FromQuery] string? type,
        [FromQuery] Guid? currentPageId)
    {
        if (!await UserCanAccessDocument(documentId)) return Forbid();

        var query = _db.Annotations
            .Where(a => a.Page!.DocumentId == documentId);

        if (!string.IsNullOrEmpty(type))
        {
            if (!Enum.TryParse<AnnotationType>(type, out var t))
                return BadRequest(new { message = $"Invalid type \"{type}\"." });
            query = query.Where(a => a.Type == t);
        }

        var rows = await query
            .Include(a => a.Caption)
            .Include(a => a.Page)
            .Select(a => new
            {
                a.Id,
                a.PageId,
                PageNumber = a.Page!.PageNumber,
                a.Content,
                CaptionLabel = a.Caption!.Name,
            })
            .ToListAsync();

        if (currentPageId is { } cpid)
            rows = rows.OrderByDescending(r => r.PageId == cpid).ThenBy(r => r.PageNumber).ToList();

        return Ok(rows);
    }

    // ---------- helpers ----------

    internal static Dictionary<Guid, int> ComputeCaptionNumbers(IEnumerable<Annotation> annotations)
    {
        var result = new Dictionary<Guid, int>();
        var groups = annotations.GroupBy(a => new { a.PageId, a.CaptionId });
        foreach (var g in groups)
        {
            var ordered = g.OrderBy(a => a.CreatedAt).ThenBy(a => a.Id).ToList();
            for (var i = 0; i < ordered.Count; i++)
                result[ordered[i].Id] = i + 1;
        }
        return result;
    }

    internal static Caption? PickDefaultCaption(IReadOnlyList<Caption> documentCaptions, int depth)
    {
        // Each depth gets its own caption (depth 0 -> #1, depth 1 -> #2, ...).
        // Returns null when no caption exists at that depth yet — the caller
        // then auto-creates an "Annotation lvl N" caption.
        var ordered = documentCaptions.OrderBy(c => c.CreatedAt).ThenBy(c => c.Id).ToList();
        if (depth < 0) depth = 0;
        return depth < ordered.Count ? ordered[depth] : null;
    }

    private async Task<int> ComputeDepth(Guid? parentId)
    {
        var depth = 0;
        var current = parentId;
        while (current is { } id)
        {
            depth++;
            current = await _db.Annotations
                .Where(a => a.Id == id)
                .Select(a => a.ParentId)
                .FirstOrDefaultAsync();
            if (depth > 64) break;
        }
        return depth;
    }

    private async Task<bool> IsDescendant(Guid candidateAncestorId, Guid possibleDescendantId)
    {
        var current = (Guid?)candidateAncestorId;
        var hops = 0;
        while (current is { } id)
        {
            if (id == possibleDescendantId) return true;
            current = await _db.Annotations
                .Where(a => a.Id == id)
                .Select(a => a.ParentId)
                .FirstOrDefaultAsync();
            if (++hops > 64) return true;
        }
        return false;
    }

    private static bool ValidateTypeFields(AnnotationType type, string? transcription, Guid? transcriptionRefId, out string error)
    {
        error = "";
        return type switch
        {
            AnnotationType.Text   when transcription is null && transcriptionRefId is null => true,
            AnnotationType.Cipher when transcriptionRefId is null => true,
            AnnotationType.Symbol when transcription is null => true,
            AnnotationType.Text   => SetError(out error, "Text type cannot carry transcription/transcriptionRefId."),
            AnnotationType.Cipher => SetError(out error, "Cipher type cannot carry transcriptionRefId."),
            AnnotationType.Symbol => SetError(out error, "Symbol type cannot carry transcription text."),
            _ => SetError(out error, "Unknown type."),
        };

        static bool SetError(out string e, string m) { e = m; return false; }
    }

    private async Task<bool> UserCanAccessPage(Guid pageId)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        return await _db.Pages.AnyAsync(p =>
            p.Id == pageId &&
            (p.Document!.OwnerId == userId
             || p.Document.Visibility == Visibility.Public
             || p.Document.Shares.Any(s => s.UserId == userId)));
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
