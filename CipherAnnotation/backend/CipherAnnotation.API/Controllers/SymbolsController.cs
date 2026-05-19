using CipherAnnotation.API.Extensions;
using CipherAnnotation.Core.Common;
using CipherAnnotation.Core.DTOs.Symbol;
using CipherAnnotation.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CipherAnnotation.API.Controllers;

[ApiController]
[Route("api/symbols")]
[Authorize]
public class SymbolsController : ControllerBase
{
    private const long MaxPngBytes = 2 * 1024 * 1024;

    private readonly ISymbolService _symbols;

    public SymbolsController(ISymbolService symbols)
    {
        _symbols = symbols;
    }

    [HttpPost("auto-fill-content")]
    [ProducesResponseType(typeof(AutoFillContentResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> AutoFillContentAsync(
        [FromBody] AutoFillContentRequest request, CancellationToken ct = default)
    {
        if (request is null || request.Id == Guid.Empty)
            return BadRequest(new { message = "scope and id are required." });
        var result = await _symbols.AutoFillContentAsync(request.Scope, request.Id, User.GetUserId(), ct);
        return result.ToActionResult();
    }

    [HttpPost]
    [ProducesResponseType(typeof(SymbolDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateAsync(
        [FromForm] IFormFile? pngFile,
        [FromForm] string? content,
        CancellationToken ct = default)
    {
        var userId = User.GetUserId();

        byte[]? pngBytes = null;
        string fileName = "symbol.png";
        if (pngFile is not null && pngFile.Length > 0)
        {
            if (pngFile.Length > MaxPngBytes)
                return BadRequest(new { message = $"PNG exceeds {MaxPngBytes} bytes." });
            if (!string.Equals(pngFile.ContentType, "image/png", StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { message = "pngFile must be image/png." });

            using var ms = new MemoryStream();
            await pngFile.CopyToAsync(ms, ct);
            pngBytes = ms.ToArray();
            fileName = pngFile.FileName ?? "symbol.png";
        }

        var result = await _symbols.CreateAsync(userId, content, pngBytes, fileName, ct);
        return result.ToCreatedResult();
    }

    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<SymbolDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListAsync(
        [FromQuery] string? scope = "all",
        [FromQuery] string? contentSearch = null,
        [FromQuery] string? documentIds = null,
        [FromQuery] bool onlyUncaptioned = false,
        [FromQuery] int take = 50,
        [FromQuery] int skip = 0,
        CancellationToken ct = default)
    {
        var ids = ParseGuidList(documentIds);
        var result = await _symbols.ListAsync(
            User.GetUserId(), scope ?? "all", contentSearch, ids, onlyUncaptioned, take, skip, ct);
        return result.ToActionResult();
    }

    [HttpGet("unlinked-annotations")]
    [ProducesResponseType(typeof(IEnumerable<UnlinkedSymbolAnnotationDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListUnlinkedAnnotationsAsync(
        [FromQuery] string? scope = "all",
        [FromQuery] string? contentSearch = null,
        [FromQuery] string? documentIds = null,
        [FromQuery] bool onlyUncaptioned = false,
        [FromQuery] int take = 50,
        [FromQuery] int skip = 0,
        CancellationToken ct = default)
    {
        var ids = ParseGuidList(documentIds);
        var result = await _symbols.ListUnlinkedAnnotationsAsync(
            User.GetUserId(), scope ?? "all", contentSearch, ids, onlyUncaptioned, take, skip, ct);
        return result.ToActionResult();
    }

    private static IReadOnlyList<Guid>? ParseGuidList(string? csv)
    {
        if (string.IsNullOrWhiteSpace(csv)) return null;
        var parts = csv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var ids = new List<Guid>(parts.Length);
        foreach (var p in parts)
            if (Guid.TryParse(p, out var g)) ids.Add(g);
        return ids.Count == 0 ? null : ids;
    }

    [HttpGet("suggestions")]
    [ProducesResponseType(typeof(IEnumerable<SymbolSuggestionDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> SuggestionsAsync(
        [FromQuery] string? content = null,
        [FromQuery] int take = 6,
        CancellationToken ct = default)
    {
        var result = await _symbols.GetSuggestionsAsync(User.GetUserId(), content, take, ct);
        return result.ToActionResult();
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(SymbolDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var result = await _symbols.GetByIdAsync(id, User.GetUserId(), ct);
        return result.ToActionResult();
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(SymbolDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateAsync(
        Guid id, [FromBody] UpdateSymbolRequest request, CancellationToken ct = default)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        var result = await _symbols.UpdateAsync(id, User.GetUserId(), request.Content, ct);
        return result.ToActionResult();
    }

    [HttpPut("rename-caption")]
    [ProducesResponseType(typeof(RenameCaptionResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> RenameCaptionByContentAsync(
        [FromBody] RenameCaptionByContentRequest request, CancellationToken ct = default)
    {
        if (request is null) return BadRequest(new { message = "Body is required." });
        var result = await _symbols.RenameCaptionByContentAsync(
            User.GetUserId(), request.OldContent, request.NewContent, ct);
        return result.ToActionResult();
    }

    [HttpPut("{id:guid}/rename-caption")]
    [ProducesResponseType(typeof(RenameCaptionResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> RenameCaptionAsync(
        Guid id, [FromBody] RenameCaptionRequest request, CancellationToken ct = default)
    {
        if (request is null) return BadRequest(new { message = "Body is required." });
        var result = await _symbols.RenameCaptionAsync(id, User.GetUserId(), request.Content, ct);
        return result.ToActionResult();
    }

    [HttpPut("{id:guid}/image")]
    [ProducesResponseType(typeof(SymbolDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateImageAsync(
        Guid id,
        [FromForm] IFormFile pngFile,
        CancellationToken ct = default)
    {
        if (pngFile is null || pngFile.Length == 0)
            return BadRequest(new { message = "pngFile is required." });
        if (pngFile.Length > MaxPngBytes)
            return BadRequest(new { message = $"PNG exceeds {MaxPngBytes} bytes." });
        if (!string.Equals(pngFile.ContentType, "image/png", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "pngFile must be image/png." });

        using var ms = new MemoryStream();
        await pngFile.CopyToAsync(ms, ct);

        var result = await _symbols.UpdateImageAsync(
            id, User.GetUserId(), ms.ToArray(), pngFile.FileName ?? "symbol.png", ct);
        return result.ToActionResult();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var result = await _symbols.DeleteAsync(id, User.GetUserId(), ct);
        return result.ToActionResult();
    }

    [HttpGet("{id:guid}/image")]
    public async Task<IActionResult> GetImageAsync(Guid id, CancellationToken ct = default)
    {
        var result = await _symbols.GetImageAsync(id, User.GetUserId(), ct);
        if (!result.IsSuccess) return result.ToActionResult();

        var blob = result.Value!;
        var etag = $"\"{blob.Sha256}\"";
        var ifNoneMatch = Request.Headers.IfNoneMatch.ToString();
        if (!string.IsNullOrEmpty(ifNoneMatch) && ifNoneMatch.Contains(etag, StringComparison.Ordinal))
            return StatusCode(StatusCodes.Status304NotModified);

        Response.Headers.ETag = etag;
        Response.Headers.CacheControl = "private, max-age=3600";
        return File(blob.Data, blob.ContentType);
    }

    [HttpGet("{id:guid}/occurrences")]
    [ProducesResponseType(typeof(IEnumerable<SymbolOccurrenceDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetOccurrencesAsync(
        Guid id, [FromQuery] int take = 100, [FromQuery] int skip = 0, CancellationToken ct = default)
    {
        var result = await _symbols.GetOccurrencesAsync(id, User.GetUserId(), take, skip, ct);
        return result.ToActionResult();
    }

    [HttpPost("{id:guid}/recognize")]
    [ProducesResponseType(typeof(RecognizeSymbolResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> RecognizeAsync(Guid id, CancellationToken ct = default)
    {
        var result = await _symbols.RecognizeAsync(id, User.GetUserId(), ct);
        return result.ToActionResult();
    }

}
