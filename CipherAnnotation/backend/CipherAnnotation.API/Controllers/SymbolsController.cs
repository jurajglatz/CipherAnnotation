using System.Security.Claims;
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

    [HttpPost]
    [ProducesResponseType(typeof(SymbolDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateAsync(
        [FromForm] IFormFile pngFile,
        [FromForm] string? content,
        CancellationToken ct = default)
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty) return Unauthorized();

        if (pngFile is null || pngFile.Length == 0)
            return BadRequest(new { message = "pngFile is required." });
        if (pngFile.Length > MaxPngBytes)
            return BadRequest(new { message = $"PNG exceeds {MaxPngBytes} bytes." });
        if (!string.Equals(pngFile.ContentType, "image/png", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "pngFile must be image/png." });

        using var ms = new MemoryStream();
        await pngFile.CopyToAsync(ms, ct);

        var result = await _symbols.CreateAsync(
            userId, content, ms.ToArray(), pngFile.FileName ?? "symbol.png", ct);
        return result.ToCreatedResult();
    }

    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<SymbolDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListAsync(
        [FromQuery] string? scope = "all",
        [FromQuery] string? contentSearch = null,
        [FromQuery] int take = 50,
        [FromQuery] int skip = 0,
        CancellationToken ct = default)
    {
        var result = await _symbols.ListAsync(
            GetCurrentUserId(), scope ?? "all", contentSearch, take, skip, ct);
        return result.ToActionResult();
    }

    [HttpGet("suggestions")]
    [ProducesResponseType(typeof(IEnumerable<SymbolSuggestionDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> SuggestionsAsync(
        [FromQuery] string? content = null,
        [FromQuery] int take = 6,
        CancellationToken ct = default)
    {
        var result = await _symbols.GetSuggestionsAsync(GetCurrentUserId(), content, take, ct);
        return result.ToActionResult();
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(SymbolDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var result = await _symbols.GetByIdAsync(id, GetCurrentUserId(), ct);
        return result.ToActionResult();
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(SymbolDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateAsync(
        Guid id, [FromBody] UpdateSymbolRequest request, CancellationToken ct = default)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        var result = await _symbols.UpdateAsync(id, GetCurrentUserId(), request.Content, ct);
        return result.ToActionResult();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var result = await _symbols.DeleteAsync(id, GetCurrentUserId(), ct);
        return result.ToActionResult();
    }

    [HttpGet("{id:guid}/image")]
    public async Task<IActionResult> GetImageAsync(Guid id, CancellationToken ct = default)
    {
        var result = await _symbols.GetImageAsync(id, GetCurrentUserId(), ct);
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
        var result = await _symbols.GetOccurrencesAsync(id, GetCurrentUserId(), take, skip, ct);
        return result.ToActionResult();
    }

    [HttpPost("{id:guid}/recognize")]
    [ProducesResponseType(typeof(RecognizeSymbolResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> RecognizeAsync(Guid id, CancellationToken ct = default)
    {
        var result = await _symbols.RecognizeAsync(id, GetCurrentUserId(), ct);
        return result.ToActionResult();
    }

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(userIdClaim, out var userId) ? userId : Guid.Empty;
    }
}
