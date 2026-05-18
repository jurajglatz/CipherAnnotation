using CipherAnnotation.Core.Common;
using CipherAnnotation.Core.DTOs.Annotation;
using CipherAnnotation.Core.DTOs.Symbol;
using CipherAnnotation.Core.Entities;
using CipherAnnotation.Core.Enums;
using CipherAnnotation.Core.Interfaces;
using CipherAnnotation.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;

namespace CipherAnnotation.Infrastructure.Services.Symbols;

public class SymbolService : ISymbolService
{
    private readonly AppDbContext _db;
    private readonly IFileStorageService _fileStorage;
    private readonly IVlmSuggestionService _vlm;
    private readonly IAppSettingsService _settings;

    public SymbolService(
        AppDbContext db,
        IFileStorageService fileStorage,
        IVlmSuggestionService vlm,
        IAppSettingsService settings)
    {
        _db = db;
        _fileStorage = fileStorage;
        _vlm = vlm;
        _settings = settings;
    }

    public async Task<ServiceResult<SymbolDto>> CreateAsync(
        Guid currentUserId, string? content, byte[] pngBytes, string fileName, CancellationToken ct = default)
    {
        if (currentUserId == Guid.Empty)
            return ServiceResult<SymbolDto>.Unauthorized();
        if (pngBytes is null || pngBytes.Length == 0)
            return ServiceResult<SymbolDto>.BadRequest("pngFile is required.");

        var blobId = await _fileStorage.SaveAsync(pngBytes, fileName, "image/png", ct);

        var symbol = new Symbol
        {
            OwnerUserId = currentUserId,
            Content = string.IsNullOrWhiteSpace(content) ? null : content,
            ImageBlobId = blobId,
        };
        _db.Symbols.Add(symbol);
        await _db.SaveChangesAsync(ct);

        return ServiceResult<SymbolDto>.Success(ToDto(symbol, referenceCount: 0));
    }

    public async Task<ServiceResult<IEnumerable<SymbolDto>>> ListAsync(
        Guid currentUserId, string scope, string? contentSearch, int take, int skip, CancellationToken ct = default)
    {
        if (currentUserId == Guid.Empty)
            return ServiceResult<IEnumerable<SymbolDto>>.Unauthorized();

        take = Math.Clamp(take <= 0 ? 50 : take, 1, 200);
        skip = Math.Max(0, skip);

        var s = scope?.ToLowerInvariant() ?? "all";

        // Symbol is visible if (a) the user owns it (and scope allows owned), or
        // (b) it has at least one occurrence visible to the user under the chosen scope.
        IQueryable<Symbol> query = _db.Symbols.AsNoTracking().Where(sym =>
            (s == "mine" && sym.OwnerUserId == currentUserId) ||
            (s == "shared" && sym.Annotations.Any(a =>
                a.Page!.Document!.Shares.Any(sh => sh.UserId == currentUserId))) ||
            (s == "public" && sym.Annotations.Any(a =>
                a.Page!.Document!.Visibility == Visibility.Public)) ||
            (s == "all" && (sym.OwnerUserId == currentUserId
                || sym.Annotations.Any(a =>
                    a.Page!.Document!.OwnerId == currentUserId
                    || a.Page.Document.Visibility == Visibility.Public
                    || a.Page.Document.Shares.Any(sh => sh.UserId == currentUserId)))));

        if (!string.IsNullOrWhiteSpace(contentSearch))
        {
            var q = contentSearch.Trim();
            query = query.Where(sym => sym.Content != null && EF.Functions.ILike(sym.Content, $"%{q}%"));
        }

        var rows = await query
            .OrderByDescending(sym => sym.CreatedAt)
            .Skip(skip)
            .Take(take)
            .Select(sym => new
            {
                Symbol = sym,
                ReferenceCount = sym.Annotations.Count(a =>
                    a.Page!.Document!.OwnerId == currentUserId
                    || a.Page.Document.Visibility == Visibility.Public
                    || a.Page.Document.Shares.Any(sh => sh.UserId == currentUserId)),
            })
            .ToListAsync(ct);

        return ServiceResult<IEnumerable<SymbolDto>>.Success(
            rows.Select(r => ToDto(r.Symbol, r.ReferenceCount)));
    }

    public async Task<ServiceResult<IEnumerable<SymbolSuggestionDto>>> GetSuggestionsAsync(
        Guid currentUserId, string? content, int take, CancellationToken ct = default)
    {
        if (currentUserId == Guid.Empty)
            return ServiceResult<IEnumerable<SymbolSuggestionDto>>.Unauthorized();

        take = Math.Clamp(take <= 0 ? 6 : take, 1, 50);
        var q = (content ?? string.Empty).Trim();

        var query = _db.Symbols.AsNoTracking()
            .Where(s => s.OwnerUserId == currentUserId
                     || s.Annotations.Any(a =>
                            a.Page!.Document!.Visibility == Visibility.Public
                         || a.Page.Document.Shares.Any(sh => sh.UserId == currentUserId)));

        if (q.Length > 0)
            query = query.Where(s => s.Content != null && EF.Functions.ILike(s.Content, $"{q}%"));

        var rows = await query
            .OrderByDescending(s => s.CreatedAt)
            .Take(take)
            .Select(s => new { s.Id, s.Content })
            .ToListAsync(ct);

        return ServiceResult<IEnumerable<SymbolSuggestionDto>>.Success(
            rows.Select(r => new SymbolSuggestionDto
            {
                Id = r.Id,
                Content = r.Content,
                ImageUrl = ImageUrl(r.Id),
            }));
    }

    public async Task<ServiceResult<SymbolDto>> GetByIdAsync(Guid id, Guid currentUserId, CancellationToken ct = default)
    {
        var symbol = await LoadVisibleSymbolAsync(id, currentUserId, ct);
        if (symbol is null) return ServiceResult<SymbolDto>.NotFound();

        var refCount = await CountVisibleOccurrencesAsync(id, currentUserId, ct);
        return ServiceResult<SymbolDto>.Success(ToDto(symbol, refCount));
    }

    public async Task<ServiceResult<SymbolDto>> UpdateAsync(Guid id, Guid currentUserId, string? content, CancellationToken ct = default)
    {
        var symbol = await _db.Symbols.FirstOrDefaultAsync(s => s.Id == id, ct);
        if (symbol is null) return ServiceResult<SymbolDto>.NotFound();
        if (symbol.OwnerUserId != currentUserId) return ServiceResult<SymbolDto>.Forbidden();

        symbol.Content = string.IsNullOrWhiteSpace(content) ? null : content;
        await _db.SaveChangesAsync(ct);

        var refCount = await CountVisibleOccurrencesAsync(id, currentUserId, ct);
        return ServiceResult<SymbolDto>.Success(ToDto(symbol, refCount));
    }

    public async Task<ServiceResult<SymbolDto>> UpdateImageAsync(
        Guid id, Guid currentUserId, byte[] pngBytes, string fileName, CancellationToken ct = default)
    {
        if (pngBytes is null || pngBytes.Length == 0)
            return ServiceResult<SymbolDto>.BadRequest("pngFile is required.");

        var symbol = await _db.Symbols.FirstOrDefaultAsync(s => s.Id == id, ct);
        if (symbol is null) return ServiceResult<SymbolDto>.NotFound();
        if (symbol.OwnerUserId != currentUserId) return ServiceResult<SymbolDto>.Forbidden();

        var blobId = await _fileStorage.SaveAsync(pngBytes, fileName, "image/png", ct);
        symbol.ImageBlobId = blobId;
        await _db.SaveChangesAsync(ct);

        var refCount = await CountVisibleOccurrencesAsync(id, currentUserId, ct);
        return ServiceResult<SymbolDto>.Success(ToDto(symbol, refCount));
    }

    public async Task<ServiceResult> DeleteAsync(Guid id, Guid currentUserId, CancellationToken ct = default)
    {
        var symbol = await _db.Symbols.FirstOrDefaultAsync(s => s.Id == id, ct);
        if (symbol is null) return ServiceResult.NotFound();
        if (symbol.OwnerUserId != currentUserId) return ServiceResult.Forbidden();

        _db.Symbols.Remove(symbol);
        await _db.SaveChangesAsync(ct);
        // FileBlob is left intact (may be shared); housekeeping out of scope.
        return ServiceResult.Success();
    }

    public async Task<ServiceResult<BlobContent>> GetImageAsync(Guid id, Guid currentUserId, CancellationToken ct = default)
    {
        var symbol = await LoadVisibleSymbolAsync(id, currentUserId, ct);
        if (symbol is null) return ServiceResult<BlobContent>.NotFound();

        var blob = await _db.FileBlobs.AsNoTracking().FirstOrDefaultAsync(b => b.Id == symbol.ImageBlobId, ct);
        if (blob is null) return ServiceResult<BlobContent>.NotFound("Image blob not found.");

        return ServiceResult<BlobContent>.Success(new BlobContent(blob.Data, blob.ContentType, blob.Sha256));
    }

    public async Task<ServiceResult<IEnumerable<SymbolOccurrenceDto>>> GetOccurrencesAsync(
        Guid id, Guid currentUserId, int take, int skip, CancellationToken ct = default)
    {
        var symbol = await LoadVisibleSymbolAsync(id, currentUserId, ct);
        if (symbol is null) return ServiceResult<IEnumerable<SymbolOccurrenceDto>>.NotFound();

        take = Math.Clamp(take <= 0 ? 100 : take, 1, 500);
        skip = Math.Max(0, skip);

        var rows = await _db.Annotations.AsNoTracking()
            .Where(a => a.SymbolId == id
                     && (a.Page!.Document!.OwnerId == currentUserId
                         || a.Page.Document.Visibility == Visibility.Public
                         || a.Page.Document.Shares.Any(sh => sh.UserId == currentUserId)))
            .Include(a => a.BoundingBox)
            .Include(a => a.Page!).ThenInclude(p => p.Document)
            .OrderBy(a => a.Page!.DocumentId).ThenBy(a => a.Page!.PageNumber).ThenBy(a => a.CreatedAt)
            .Skip(skip)
            .Take(take)
            .ToListAsync(ct);

        var dtos = rows.Select(a => new SymbolOccurrenceDto
        {
            AnnotationId = a.Id,
            DocumentId = a.Page!.DocumentId,
            DocumentTitle = a.Page.Document!.Title,
            PageId = a.PageId,
            PageNumber = a.Page.PageNumber,
            Content = a.Content,
            BoundingBox = new BoundingBoxDto
            {
                X = a.BoundingBox!.X,
                Y = a.BoundingBox.Y,
                Width = a.BoundingBox.Width,
                Height = a.BoundingBox.Height,
            },
        });

        return ServiceResult<IEnumerable<SymbolOccurrenceDto>>.Success(dtos);
    }

    public async Task<ServiceResult<RecognizeSymbolResponse>> RecognizeAsync(Guid id, Guid currentUserId, CancellationToken ct = default)
    {
        var symbol = await LoadVisibleSymbolAsync(id, currentUserId, ct);
        if (symbol is null) return ServiceResult<RecognizeSymbolResponse>.NotFound();

        // Stub. Real HWR is wired later behind this same endpoint.
        return ServiceResult<RecognizeSymbolResponse>.Success(new RecognizeSymbolResponse
        {
            Content = null,
            Confidence = 0f,
        });
    }

    private static SymbolDto ToDto(Symbol s, int referenceCount) => new()
    {
        Id = s.Id,
        OwnerUserId = s.OwnerUserId,
        Content = s.Content,
        ImageUrl = ImageUrl(s.Id),
        ReferenceCount = referenceCount,
        CreatedAt = s.CreatedAt,
    };

    private static string ImageUrl(Guid id) => $"/api/symbols/{id}/image";

    private async Task<Symbol?> LoadVisibleSymbolAsync(Guid id, Guid currentUserId, CancellationToken ct)
    {
        if (currentUserId == Guid.Empty) return null;
        return await _db.Symbols.AsNoTracking()
            .FirstOrDefaultAsync(s =>
                s.Id == id &&
                (s.OwnerUserId == currentUserId
                 || s.Annotations.Any(a =>
                        a.Page!.Document!.OwnerId == currentUserId
                     || a.Page.Document.Visibility == Visibility.Public
                     || a.Page.Document.Shares.Any(sh => sh.UserId == currentUserId))), ct);
    }

    private Task<int> CountVisibleOccurrencesAsync(Guid id, Guid currentUserId, CancellationToken ct) =>
        _db.Annotations.AsNoTracking().CountAsync(a =>
            a.SymbolId == id &&
            (a.Page!.Document!.OwnerId == currentUserId
             || a.Page.Document.Visibility == Visibility.Public
             || a.Page.Document.Shares.Any(sh => sh.UserId == currentUserId)), ct);

    public async Task<ServiceResult<AutoFillContentResult>> AutoFillContentAsync(
        AutoFillScope scope, Guid scopeId, Guid currentUserId, CancellationToken ct = default)
    {
        if (currentUserId == Guid.Empty)
            return ServiceResult<AutoFillContentResult>.Unauthorized();

        if (!await _settings.GetBoolAsync(AppSettingKeys.AutoContentGeneratorEnabled, false, ct))
            return ServiceResult<AutoFillContentResult>.Forbidden();

        // Edit permission required — we're mutating annotation content.
        bool canEdit = scope switch
        {
            AutoFillScope.Page => await _db.Pages.AsNoTracking().AnyAsync(p =>
                p.Id == scopeId &&
                (p.Document!.OwnerId == currentUserId
                 || p.Document.Shares.Any(sh => sh.UserId == currentUserId && sh.Permission == PermissionType.Edit)), ct),
            AutoFillScope.Document => await _db.Documents.AsNoTracking().AnyAsync(d =>
                d.Id == scopeId &&
                (d.OwnerId == currentUserId
                 || d.Shares.Any(sh => sh.UserId == currentUserId && sh.Permission == PermissionType.Edit)), ct),
            _ => false,
        };
        if (!canEdit) return ServiceResult<AutoFillContentResult>.Forbidden();

        // Symbol-typed annotations with empty content in scope, with bbox + page image FK.
        IQueryable<Annotation> q = _db.Annotations
            .Where(a => a.Type == AnnotationType.Symbol
                     && (a.Content == null || a.Content == "")
                     && a.BoundingBox != null);
        q = scope == AutoFillScope.Page
            ? q.Where(a => a.PageId == scopeId)
            : q.Where(a => a.Page!.DocumentId == scopeId);

        var targets = await q
            .Include(a => a.BoundingBox)
            .Include(a => a.Page)
            .ToListAsync(ct);

        var items = new List<AutoFillContentItem>(targets.Count);
        int filled = 0, skipped = 0;

        // Cache the decoded page image per PageId so we decode each page only once.
        var pageImageCache = new Dictionary<Guid, Image<Rgba32>?>();
        // Crop everything up-front so we can hand the whole batch to the model
        // in a single call (model load cost is paid once, not per-image).
        var crops = new List<byte[]>(targets.Count);
        var cropAnnotations = new List<Annotation>(targets.Count);
        try
        {
            foreach (var ann in targets)
            {
                var page = ann.Page!;
                if (!pageImageCache.TryGetValue(page.Id, out var pageImage))
                {
                    var blob = await _db.FileBlobs.AsNoTracking()
                        .FirstOrDefaultAsync(b => b.Id == page.ImageBlobId, ct);
                    pageImage = blob is null ? null : Image.Load<Rgba32>(blob.Data);
                    pageImageCache[page.Id] = pageImage;
                }
                if (pageImage is null)
                {
                    skipped++;
                    items.Add(new AutoFillContentItem(ann.Id, null, "skipped:no-page-image"));
                    continue;
                }

                var bb = ann.BoundingBox!;
                var x = Math.Max(0, (int)MathF.Floor(bb.X));
                var y = Math.Max(0, (int)MathF.Floor(bb.Y));
                var w = Math.Min(pageImage.Width - x, (int)MathF.Ceiling(bb.Width));
                var h = Math.Min(pageImage.Height - y, (int)MathF.Ceiling(bb.Height));
                if (w <= 1 || h <= 1)
                {
                    skipped++;
                    items.Add(new AutoFillContentItem(ann.Id, null, "skipped:bbox-too-small"));
                    continue;
                }

                byte[] cropPng;
                using (var clone = pageImage.Clone(ctx => ctx.Crop(new Rectangle(x, y, w, h))))
                using (var ms = new MemoryStream())
                {
                    await clone.SaveAsPngAsync(ms, ct);
                    cropPng = ms.ToArray();
                }
                crops.Add(cropPng);
                cropAnnotations.Add(ann);
            }

            if (crops.Count > 0)
            {
                var captions = await _vlm.SuggestSymbolContentsAsync(crops, ct);
                for (var i = 0; i < cropAnnotations.Count; i++)
                {
                    var ann = cropAnnotations[i];
                    var suggestion = i < captions.Count ? captions[i] : null;
                    if (string.IsNullOrWhiteSpace(suggestion))
                    {
                        skipped++;
                        items.Add(new AutoFillContentItem(ann.Id, null, "skipped:no-suggestion"));
                        continue;
                    }
                    ann.Content = suggestion;
                    filled++;
                    items.Add(new AutoFillContentItem(ann.Id, suggestion, "filled"));
                }
            }

            if (filled > 0) await _db.SaveChangesAsync(ct);
        }
        finally
        {
            foreach (var img in pageImageCache.Values) img?.Dispose();
        }

        return ServiceResult<AutoFillContentResult>.Success(new AutoFillContentResult
        {
            Candidates = targets.Count,
            Filled = filled,
            SkippedNotOwner = 0,
            SkippedNoSuggestion = skipped,
            Items = items,
        });
    }
}
