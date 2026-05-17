using AutoMapper;
using CipherAnnotation.Core.Common;
using CipherAnnotation.Core.DTOs.Annotation;
using CipherAnnotation.Core.Entities;
using CipherAnnotation.Core.Enums;
using CipherAnnotation.Core.Interfaces;
using CipherAnnotation.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CipherAnnotation.Infrastructure.Services.Annotations;

public class AnnotationService : IAnnotationService
{
    private readonly AppDbContext _db;
    private readonly IMapper _mapper;
    private readonly IAutoAnnotationService _autoAnnotation;
    private readonly IFileStorageService _fileStorage;
    private readonly ILogger<AnnotationService> _logger;

    public AnnotationService(
        AppDbContext db,
        IMapper mapper,
        IAutoAnnotationService autoAnnotation,
        IFileStorageService fileStorage,
        ILogger<AnnotationService> logger)
    {
        _db = db;
        _mapper = mapper;
        _autoAnnotation = autoAnnotation;
        _fileStorage = fileStorage;
        _logger = logger;
    }

    public async Task<ServiceResult<IEnumerable<AnnotationDto>>> ListForPageAsync(
        Guid pageId, Guid currentUserId, CancellationToken ct = default)
    {
        if (!await UserCanAccessPageAsync(pageId, currentUserId, ct))
            return ServiceResult<IEnumerable<AnnotationDto>>.Forbidden();

        var anns = await _db.Annotations
            .Where(a => a.PageId == pageId)
            .Include(a => a.BoundingBox)
            .Include(a => a.Caption)
            .ToListAsync(ct);

        var numbers = ComputeCaptionNumbers(anns);
        var dtos = anns.Select(a => _mapper.Map<AnnotationDto>(a) with
        {
            CaptionName = a.Caption!.Name,
            CaptionNumber = numbers[a.Id],
        });
        return ServiceResult<IEnumerable<AnnotationDto>>.Success(dtos);
    }

    public async Task<ServiceResult<AnnotationDto>> CreateAsync(
        Guid pageId, Guid currentUserId,
        CreateAnnotationRequest req, CancellationToken ct = default)
    {
        if (!await UserCanEditPageAsync(pageId, currentUserId, ct))
            return ServiceResult<AnnotationDto>.Forbidden();

        if (!Enum.TryParse<AnnotationType>(req.Type, ignoreCase: false, out var type))
            return ServiceResult<AnnotationDto>.BadRequest($"Invalid type \"{req.Type}\".");

        if (!ValidateTypeFields(type, req.Transcription, req.TranscriptionRefId, out var typeError))
            return ServiceResult<AnnotationDto>.BadRequest(typeError);

        var page = await _db.Pages.FirstOrDefaultAsync(p => p.Id == pageId, ct);
        if (page is null) return ServiceResult<AnnotationDto>.NotFound("Page not found.");

        if (req.ParentId is { } parentId)
        {
            var parentPageId = await _db.Annotations
                .Where(a => a.Id == parentId)
                .Select(a => (Guid?)a.PageId)
                .FirstOrDefaultAsync(ct);
            if (parentPageId is null || parentPageId != pageId)
                return ServiceResult<AnnotationDto>.BadRequest("Parent annotation must be on the same page.");
        }

        if (type == AnnotationType.Symbol && req.TranscriptionRefId is { } refId)
        {
            var ok = await _db.Annotations.AnyAsync(a =>
                a.Id == refId &&
                a.Type == AnnotationType.Text &&
                a.Page!.DocumentId == page.DocumentId, ct);
            if (!ok)
                return ServiceResult<AnnotationDto>.BadRequest(
                    "transcriptionRefId must point to a Text annotation in the same document.");
        }

        var depth = await ComputeDepthAsync(req.ParentId, ct);
        var documentCaptions = await _db.Captions
            .Where(c => c.DocumentId == page.DocumentId)
            .ToListAsync(ct);

        Caption? caption;
        if (req.CaptionId is { } cid)
        {
            caption = documentCaptions.FirstOrDefault(c => c.Id == cid);
            if (caption is null)
                return ServiceResult<AnnotationDto>.BadRequest("captionId is not a caption of this document.");
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
                await _db.SaveChangesAsync(ct);
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
        await _db.SaveChangesAsync(ct);

        await _db.Entry(ann).Reference(a => a.Caption).LoadAsync(ct);
        await _db.Entry(ann).Reference(a => a.BoundingBox).LoadAsync(ct);

        var pageAnns = await _db.Annotations.Where(a => a.PageId == pageId).ToListAsync(ct);
        var numbers = ComputeCaptionNumbers(pageAnns);

        var dto = _mapper.Map<AnnotationDto>(ann) with
        {
            CaptionName = ann.Caption!.Name,
            CaptionNumber = numbers[ann.Id],
        };
        return ServiceResult<AnnotationDto>.Success(dto);
    }

    public async Task<ServiceResult<AnnotationDto>> UpdateAsync(
        Guid pageId, Guid id, Guid currentUserId,
        UpdateAnnotationRequest req, CancellationToken ct = default)
    {
        if (!await UserCanEditPageAsync(pageId, currentUserId, ct))
            return ServiceResult<AnnotationDto>.Forbidden();

        var ann = await _db.Annotations
            .Include(a => a.BoundingBox)
            .FirstOrDefaultAsync(a => a.Id == id && a.PageId == pageId, ct);
        if (ann is null) return ServiceResult<AnnotationDto>.NotFound("Annotation not found.");

        var page = await _db.Pages.FirstAsync(p => p.Id == pageId, ct);

        if (req.ParentId.HasValue)
        {
            var newParentId = req.ParentId.Value;
            if (newParentId == id)
                return ServiceResult<AnnotationDto>.BadRequest("An annotation cannot be its own parent.");
            if (newParentId != Guid.Empty)
            {
                var sameSide = await _db.Annotations.AnyAsync(a => a.Id == newParentId && a.PageId == pageId, ct);
                if (!sameSide) return ServiceResult<AnnotationDto>.BadRequest("Parent must be on the same page.");
                if (await IsDescendantAsync(newParentId, id, ct))
                    return ServiceResult<AnnotationDto>.BadRequest("Reparenting would create a cycle.");
                ann.ParentId = newParentId;
            }
            else
            {
                ann.ParentId = null;
            }
        }

        if (req.CaptionId is { } cid)
        {
            var ok = await _db.Captions.AnyAsync(c => c.Id == cid && c.DocumentId == page.DocumentId, ct);
            if (!ok) return ServiceResult<AnnotationDto>.BadRequest("captionId is not a caption of this document.");
            ann.CaptionId = cid;
        }

        var newType = ann.Type;
        if (req.Type is not null)
        {
            if (!Enum.TryParse<AnnotationType>(req.Type, out newType))
                return ServiceResult<AnnotationDto>.BadRequest($"Invalid type \"{req.Type}\".");

            if (ann.Type == AnnotationType.Text && newType == AnnotationType.Symbol)
            {
                var refCount = await _db.Annotations.CountAsync(a => a.TranscriptionRefId == ann.Id, ct);
                if (refCount > 0)
                    return ServiceResult<AnnotationDto>.BadRequest(
                        $"Cannot change to Symbol while {refCount} annotation(s) reference this as their plaintext.");
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
                        a.Page!.DocumentId == page.DocumentId, ct);
                    if (!ok)
                        return ServiceResult<AnnotationDto>.BadRequest(
                            "transcriptionRefId must point to a Text annotation in the same document.");
                    ann.TranscriptionRefId = refId;
                }
            }
        }

        if (!ValidateTypeFields(ann.Type, ann.Transcription, ann.TranscriptionRefId, out var typeError))
            return ServiceResult<AnnotationDto>.BadRequest(typeError);

        if (req.Orientation.HasValue) ann.Orientation = req.Orientation.Value;

        if (req.BoundingBox is { } bb && ann.BoundingBox is not null)
        {
            ann.BoundingBox.X = bb.X;
            ann.BoundingBox.Y = bb.Y;
            ann.BoundingBox.Width = bb.Width;
            ann.BoundingBox.Height = bb.Height;
        }

        await _db.SaveChangesAsync(ct);
        await _db.Entry(ann).Reference(a => a.Caption).LoadAsync(ct);

        var pageAnns = await _db.Annotations.Where(a => a.PageId == pageId).ToListAsync(ct);
        var numbers = ComputeCaptionNumbers(pageAnns);

        var dto = _mapper.Map<AnnotationDto>(ann) with
        {
            CaptionName = ann.Caption!.Name,
            CaptionNumber = numbers[ann.Id],
        };
        return ServiceResult<AnnotationDto>.Success(dto);
    }

    public async Task<ServiceResult> DeleteAsync(
        Guid pageId, Guid id, Guid currentUserId, CancellationToken ct = default)
    {
        if (!await UserCanEditPageAsync(pageId, currentUserId, ct))
            return ServiceResult.Forbidden();

        var ann = await _db.Annotations.FirstOrDefaultAsync(a => a.Id == id && a.PageId == pageId, ct);
        if (ann is null) return ServiceResult.NotFound("Annotation not found.");

        _db.Annotations.Remove(ann);
        await _db.SaveChangesAsync(ct);
        return ServiceResult.Success();
    }

    public async Task<ServiceResult<BoundingBoxDto>> UpdateBoundingBoxAsync(
        Guid pageId, Guid id, Guid currentUserId,
        BoundingBoxDto req, CancellationToken ct = default)
    {
        if (!await UserCanEditPageAsync(pageId, currentUserId, ct))
            return ServiceResult<BoundingBoxDto>.Forbidden();

        var ann = await _db.Annotations
            .Include(a => a.BoundingBox)
            .FirstOrDefaultAsync(a => a.Id == id && a.PageId == pageId, ct);
        if (ann is null || ann.BoundingBox is null)
            return ServiceResult<BoundingBoxDto>.NotFound("Annotation or bounding box not found.");

        ann.BoundingBox.X = req.X;
        ann.BoundingBox.Y = req.Y;
        ann.BoundingBox.Width = req.Width;
        ann.BoundingBox.Height = req.Height;
        await _db.SaveChangesAsync(ct);

        return ServiceResult<BoundingBoxDto>.Success(_mapper.Map<BoundingBoxDto>(ann.BoundingBox));
    }

    public async Task<ServiceResult<IEnumerable<DocumentAnnotationItemDto>>> ListForDocumentAsync(
        Guid documentId, Guid currentUserId, string? type, Guid? currentPageId,
        CancellationToken ct = default)
    {
        if (!await UserCanAccessDocumentAsync(documentId, currentUserId, ct))
            return ServiceResult<IEnumerable<DocumentAnnotationItemDto>>.Forbidden();

        var query = _db.Annotations.Where(a => a.Page!.DocumentId == documentId);

        if (!string.IsNullOrEmpty(type))
        {
            if (!Enum.TryParse<AnnotationType>(type, out var t))
                return ServiceResult<IEnumerable<DocumentAnnotationItemDto>>.BadRequest($"Invalid type \"{type}\".");
            query = query.Where(a => a.Type == t);
        }

        var rows = await query
            .Include(a => a.Caption)
            .Include(a => a.Page)
            .Select(a => new DocumentAnnotationItemDto
            {
                Id = a.Id,
                PageId = a.PageId,
                PageNumber = a.Page!.PageNumber,
                Content = a.Content,
                CaptionLabel = a.Caption!.Name,
            })
            .ToListAsync(ct);

        if (currentPageId is { } cpid)
            rows = rows.OrderByDescending(r => r.PageId == cpid).ThenBy(r => r.PageNumber).ToList();

        return ServiceResult<IEnumerable<DocumentAnnotationItemDto>>.Success(rows);
    }

    public async Task<ServiceResult<IEnumerable<AnnotationDto>>> AutoAnnotateAsync(
        Guid pageId, Guid currentUserId, CancellationToken ct = default)
    {
        if (!await UserCanEditPageAsync(pageId, currentUserId, ct))
            return ServiceResult<IEnumerable<AnnotationDto>>.Forbidden();

        var page = await _db.Pages
            .Include(p => p.Document)
            .FirstOrDefaultAsync(p => p.Id == pageId, ct);
        if (page is null) return ServiceResult<IEnumerable<AnnotationDto>>.NotFound("Page not found.");

        var blobId = page.ProcessedImageBlobId ?? page.ImageBlobId;
        var blob = await _fileStorage.GetAsync(blobId, ct);
        if (blob is null)
            return ServiceResult<IEnumerable<AnnotationDto>>.BadRequest("Page image blob is missing.");

        var imageWidth = page.Width;
        var imageHeight = page.Height;

        var ext = Path.GetExtension(blob.FileName);
        if (string.IsNullOrWhiteSpace(ext))
        {
            ext = blob.ContentType switch
            {
                "image/jpeg" => ".jpg",
                "image/png" => ".png",
                "image/webp" => ".webp",
                "image/tiff" => ".tiff",
                _ => ".png",
            };
        }

        IReadOnlyList<AutoDetection> detections;
        try
        {
            detections = await _autoAnnotation.DetectAsync(blob.Data, ext, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Auto-annotation failed for page {PageId}.", pageId);
            return ServiceResult<IEnumerable<AnnotationDto>>.BadRequest("Auto-annotation failed: " + ex.Message);
        }

        if (detections.Count == 0)
            return ServiceResult<IEnumerable<AnnotationDto>>.Success(Array.Empty<AnnotationDto>());

        var captions = await _db.Captions
            .Where(c => c.DocumentId == page.DocumentId)
            .ToListAsync(ct);

        async Task<Caption> GetOrCreateCaption(string name)
        {
            var existing = captions.FirstOrDefault(c =>
                string.Equals(c.Name, name, StringComparison.OrdinalIgnoreCase));
            if (existing is not null) return existing;
            var fresh = new Caption { DocumentId = page.DocumentId, Name = name };
            _db.Captions.Add(fresh);
            await _db.SaveChangesAsync(ct);
            captions.Add(fresh);
            return fresh;
        }

        Caption ResolveCaptionFor(string className)
        {
            var lc = className.ToLowerInvariant();
            var hit = captions.FirstOrDefault(c => c.Name.ToLowerInvariant() == lc)
                   ?? captions.FirstOrDefault(c => lc.Contains(c.Name.ToLowerInvariant()))
                   ?? captions.FirstOrDefault(c => c.Name.ToLowerInvariant().Contains(lc));
            return hit ?? captions.First();
        }

        var sectionCaption = await GetOrCreateCaption("Section");
        var pairCaption = await GetOrCreateCaption("Pair");
        var elementCaption = await GetOrCreateCaption("Element");

        var det = detections.Select(d =>
        {
            var lc = d.ClassName.ToLowerInvariant();
            Caption cap = lc.Contains("section") ? sectionCaption
                        : lc.Contains("pair") ? pairCaption
                        : lc.Contains("element") ? elementCaption
                        : ResolveCaptionFor(d.ClassName);
            return new
            {
                Detection = d,
                Caption = cap,
                Box = ClampBox(d.X1, d.Y1, d.X2, d.Y2, imageWidth, imageHeight),
            };
        }).ToList();

        static bool Contains((float X, float Y, float W, float H) outer, (float X, float Y, float W, float H) inner)
        {
            var ix = MathF.Max(outer.X, inner.X);
            var iy = MathF.Max(outer.Y, inner.Y);
            var ax = MathF.Min(outer.X + outer.W, inner.X + inner.W);
            var ay = MathF.Min(outer.Y + outer.H, inner.Y + inner.H);
            var iw = MathF.Max(0, ax - ix);
            var ih = MathF.Max(0, ay - iy);
            var innerArea = MathF.Max(1e-3f, inner.W * inner.H);
            return (iw * ih) / innerArea >= 0.8f;
        }

        var sections = det.Where(x => x.Caption.Id == sectionCaption.Id).ToList();
        var pairs = det.Where(x => x.Caption.Id == pairCaption.Id).ToList();
        var elements = det.Where(x => x.Caption.Id == elementCaption.Id).ToList();

        var created = new List<Annotation>();
        var sectionAnnByDet = new Dictionary<int, Annotation>();
        var pairAnnByDet = new Dictionary<int, Annotation>();

        Annotation MakeAnnotation(Caption cap, (float X, float Y, float W, float H) box, Guid? parentId)
            => new()
            {
                PageId = pageId,
                ParentId = parentId,
                CaptionId = cap.Id,
                Type = AnnotationType.Text,
                Orientation = 0,
                BoundingBox = new BoundingBox { X = box.X, Y = box.Y, Width = box.W, Height = box.H },
            };

        for (int i = 0; i < sections.Count; i++)
        {
            var ann = MakeAnnotation(sectionCaption, sections[i].Box, null);
            _db.Annotations.Add(ann);
            sectionAnnByDet[i] = ann;
            created.Add(ann);
        }
        await _db.SaveChangesAsync(ct);

        for (int i = 0; i < pairs.Count; i++)
        {
            var p = pairs[i].Box;
            Guid? parentId = null;
            int? bestSec = null;
            float bestArea = 0;
            for (int s = 0; s < sections.Count; s++)
            {
                if (Contains(sections[s].Box, p))
                {
                    var a = sections[s].Box.W * sections[s].Box.H;
                    if (bestSec is null || a > bestArea) { bestSec = s; bestArea = a; }
                }
            }
            if (bestSec is { } si) parentId = sectionAnnByDet[si].Id;
            var ann = MakeAnnotation(pairCaption, p, parentId);
            _db.Annotations.Add(ann);
            pairAnnByDet[i] = ann;
            created.Add(ann);
        }
        await _db.SaveChangesAsync(ct);

        for (int i = 0; i < elements.Count; i++)
        {
            var e = elements[i].Box;
            Guid? parentId = null;
            int? bestPair = null;
            float bestArea = float.MaxValue;
            for (int pi = 0; pi < pairs.Count; pi++)
            {
                if (Contains(pairs[pi].Box, e))
                {
                    var a = pairs[pi].Box.W * pairs[pi].Box.H;
                    if (bestPair is null || a < bestArea) { bestPair = pi; bestArea = a; }
                }
            }
            if (bestPair is { } pidx)
            {
                parentId = pairAnnByDet[pidx].Id;
            }
            else
            {
                int? bestSec = null;
                var bestSecArea = float.MaxValue;
                for (int s = 0; s < sections.Count; s++)
                {
                    if (Contains(sections[s].Box, e))
                    {
                        var a = sections[s].Box.W * sections[s].Box.H;
                        if (bestSec is null || a < bestSecArea) { bestSec = s; bestSecArea = a; }
                    }
                }
                if (bestSec is { } si) parentId = sectionAnnByDet[si].Id;
            }
            var ann = MakeAnnotation(elementCaption, e, parentId);
            _db.Annotations.Add(ann);
            created.Add(ann);
        }
        await _db.SaveChangesAsync(ct);

        var ids = created.Select(a => a.Id).ToList();
        var loaded = await _db.Annotations
            .Where(a => ids.Contains(a.Id))
            .Include(a => a.BoundingBox)
            .Include(a => a.Caption)
            .ToListAsync(ct);

        var pageAnns = await _db.Annotations.Where(a => a.PageId == pageId).ToListAsync(ct);
        var numbers = ComputeCaptionNumbers(pageAnns);

        var dtos = loaded.Select(a => _mapper.Map<AnnotationDto>(a) with
        {
            CaptionName = a.Caption!.Name,
            CaptionNumber = numbers[a.Id],
        });
        return ServiceResult<IEnumerable<AnnotationDto>>.Success(dtos);
    }

    // ----- public static helpers (kept for unit-test access) -----

    public static Dictionary<Guid, int> ComputeCaptionNumbers(IEnumerable<Annotation> annotations)
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

    public static Caption? PickDefaultCaption(IReadOnlyList<Caption> documentCaptions, int depth)
    {
        var ordered = documentCaptions.OrderBy(c => c.CreatedAt).ThenBy(c => c.Id).ToList();
        if (depth < 0) depth = 0;
        return depth < ordered.Count ? ordered[depth] : null;
    }

    private static (float X, float Y, float W, float H) ClampBox(
        float x1, float y1, float x2, float y2, int imageW, int imageH)
    {
        var xa = MathF.Max(0, MathF.Min(x1, x2));
        var ya = MathF.Max(0, MathF.Min(y1, y2));
        var xb = MathF.Min(imageW, MathF.Max(x1, x2));
        var yb = MathF.Min(imageH, MathF.Max(y1, y2));
        return (xa, ya, MathF.Max(1, xb - xa), MathF.Max(1, yb - ya));
    }

    private async Task<int> ComputeDepthAsync(Guid? parentId, CancellationToken ct)
    {
        var depth = 0;
        var current = parentId;
        while (current is { } id)
        {
            depth++;
            current = await _db.Annotations
                .Where(a => a.Id == id)
                .Select(a => a.ParentId)
                .FirstOrDefaultAsync(ct);
            if (depth > 64) break;
        }
        return depth;
    }

    private async Task<bool> IsDescendantAsync(Guid candidateAncestorId, Guid possibleDescendantId, CancellationToken ct)
    {
        var current = (Guid?)candidateAncestorId;
        var hops = 0;
        while (current is { } id)
        {
            if (id == possibleDescendantId) return true;
            current = await _db.Annotations
                .Where(a => a.Id == id)
                .Select(a => a.ParentId)
                .FirstOrDefaultAsync(ct);
            if (++hops > 64) return true;
        }
        return false;
    }

    private static bool ValidateTypeFields(AnnotationType type, string? transcription, Guid? transcriptionRefId, out string error)
    {
        error = "";
        return type switch
        {
            AnnotationType.Text when transcription is null && transcriptionRefId is null => true,
            AnnotationType.Cipher when transcriptionRefId is null => true,
            AnnotationType.Symbol when transcription is null => true,
            AnnotationType.Text => SetError(out error, "Text type cannot carry transcription/transcriptionRefId."),
            AnnotationType.Cipher => SetError(out error, "Cipher type cannot carry transcriptionRefId."),
            AnnotationType.Symbol => SetError(out error, "Symbol type cannot carry transcription text."),
            _ => SetError(out error, "Unknown type."),
        };

        static bool SetError(out string e, string m) { e = m; return false; }
    }

    private Task<bool> UserCanAccessPageAsync(Guid pageId, Guid userId, CancellationToken ct) =>
        userId == Guid.Empty
            ? Task.FromResult(false)
            : _db.Pages.AnyAsync(p =>
                p.Id == pageId &&
                (p.Document!.OwnerId == userId
                 || p.Document.Visibility == Visibility.Public
                 || p.Document.Shares.Any(s => s.UserId == userId)), ct);

    private Task<bool> UserCanEditPageAsync(Guid pageId, Guid userId, CancellationToken ct) =>
        userId == Guid.Empty
            ? Task.FromResult(false)
            : _db.Pages.AnyAsync(p =>
                p.Id == pageId &&
                (p.Document!.OwnerId == userId
                 || p.Document.Shares.Any(s => s.UserId == userId && s.Permission == PermissionType.Edit)), ct);

    private Task<bool> UserCanAccessDocumentAsync(Guid documentId, Guid userId, CancellationToken ct) =>
        userId == Guid.Empty
            ? Task.FromResult(false)
            : _db.Documents.AnyAsync(d =>
                d.Id == documentId &&
                (d.OwnerId == userId
                 || d.Visibility == Visibility.Public
                 || d.Shares.Any(s => s.UserId == userId)), ct);
}
