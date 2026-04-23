using AutoMapper;
using CipherAnnotation.Core.DTOs.Symbol;
using CipherAnnotation.Core.Entities;
using CipherAnnotation.Core.Enums;
using CipherAnnotation.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace CipherAnnotation.API.Controllers;

/// <summary>
/// API controller for cipher symbol management.
/// </summary>
[ApiController]
[Route("api/symbols")]
[Authorize]
public class SymbolsController : ControllerBase
{
    private readonly ISymbolRepository _symbolRepository;
    private readonly IMapper _mapper;
    private readonly IFileStorageService _fileStorage;
    private readonly ILogger<SymbolsController> _logger;

    /// <summary>
    /// Initializes a new instance of the SymbolsController.
    /// </summary>
    public SymbolsController(
        ISymbolRepository symbolRepository,
        IMapper mapper,
        IFileStorageService fileStorage,
        ILogger<SymbolsController> logger)
    {
        _symbolRepository = symbolRepository ?? throw new ArgumentNullException(nameof(symbolRepository));
        _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
        _fileStorage = fileStorage ?? throw new ArgumentNullException(nameof(fileStorage));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Gets all symbols with optional search by code.
    /// </summary>
    /// <param name="code">Optional filter by symbol code.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of symbols matching the criteria.</returns>
    /// <response code="200">Symbols retrieved successfully.</response>
    /// <response code="500">An internal server error occurred.</response>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<SymbolDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<IEnumerable<SymbolDto>>> GetSymbolsAsync(
        [FromQuery] string? code,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var symbols = await _symbolRepository.GetAllAsync(cancellationToken);

            if (!string.IsNullOrWhiteSpace(code))
            {
                symbols = symbols.Where(s => s.Code.Contains(code, StringComparison.OrdinalIgnoreCase));
            }

            var symbolDtos = symbols
                .OrderBy(s => s.Code)
                .Select(MapSymbolToDto)
                .ToList();

            return Ok(symbolDtos);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while retrieving symbols.");
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { message = "An error occurred while retrieving symbols." });
        }
    }

    /// <summary>
    /// Gets a specific symbol by ID.
    /// </summary>
    /// <param name="id">The symbol ID.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The requested symbol.</returns>
    /// <response code="200">Symbol retrieved successfully.</response>
    /// <response code="404">Symbol not found.</response>
    /// <response code="500">An internal server error occurred.</response>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(SymbolDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<SymbolDto>> GetSymbolByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var symbol = await _symbolRepository.GetByIdAsync(id, cancellationToken);
            if (symbol == null)
            {
                _logger.LogWarning("Symbol {SymbolId} not found.", id);
                return NotFound(new { message = "Symbol not found." });
            }

            var symbolDto = MapSymbolToDto(symbol);
            return Ok(symbolDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while retrieving symbol {SymbolId}.", id);
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { message = "An error occurred while retrieving the symbol." });
        }
    }

    /// <summary>
    /// Creates a new cipher symbol.
    /// </summary>
    /// <param name="request">The symbol creation request with code.</param>
    /// <param name="file">Optional preview image file for the symbol.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The created symbol.</returns>
    /// <response code="201">Symbol created successfully.</response>
    /// <response code="400">Invalid request.</response>
    /// <response code="500">An internal server error occurred.</response>
    [HttpPost]
    [ProducesResponseType(typeof(SymbolDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<SymbolDto>> CreateSymbolAsync(
        [FromForm] CreateSymbolRequest request,
        [FromForm] IFormFile? file,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            if (string.IsNullOrWhiteSpace(request.Code))
            {
                return BadRequest(new { message = "Symbol code is required." });
            }

            Guid? previewBlobId = null;
            if (file != null && file.Length > 0)
            {
                using var ms = new MemoryStream();
                await file.CopyToAsync(ms, cancellationToken);
                var bytes = ms.ToArray();

                previewBlobId = await _fileStorage.SaveAsync(bytes, file.FileName, file.ContentType ?? "image/png", cancellationToken);
            }

            var symbol = new Symbol
            {
                Id = Guid.NewGuid(),
                Code = request.Code.Trim(),
                PreviewImageBlobId = previewBlobId,
                CreatedAt = DateTime.UtcNow
            };

            await _symbolRepository.AddAsync(symbol, cancellationToken);
            await _symbolRepository.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Symbol {SymbolId} with code '{Code}' created.", symbol.Id, symbol.Code);

            var symbolDto = MapSymbolToDto(symbol);
            return StatusCode(StatusCodes.Status201Created, symbolDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while creating a symbol.");
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { message = "An error occurred while creating the symbol." });
        }
    }

    /// <summary>
    /// Updates a cipher symbol.
    /// </summary>
    /// <param name="id">The symbol ID.</param>
    /// <param name="request">The update request with new symbol code.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The updated symbol.</returns>
    /// <response code="200">Symbol updated successfully.</response>
    /// <response code="400">Invalid request.</response>
    /// <response code="404">Symbol not found.</response>
    /// <response code="500">An internal server error occurred.</response>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(SymbolDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<SymbolDto>> UpdateSymbolAsync(
        Guid id,
        [FromBody] CreateSymbolRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var symbol = await _symbolRepository.GetByIdAsync(id, cancellationToken);
            if (symbol == null)
            {
                _logger.LogWarning("Symbol {SymbolId} not found.", id);
                return NotFound(new { message = "Symbol not found." });
            }

            if (!string.IsNullOrWhiteSpace(request.Code))
            {
                symbol.Code = request.Code.Trim();
            }

            _symbolRepository.Update(symbol);
            await _symbolRepository.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Symbol {SymbolId} updated.", id);

            var symbolDto = MapSymbolToDto(symbol);
            return Ok(symbolDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while updating symbol {SymbolId}.", id);
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { message = "An error occurred while updating the symbol." });
        }
    }

    /// <summary>
    /// Deletes a cipher symbol (Admin only).
    /// </summary>
    /// <param name="id">The symbol ID.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>No content on success.</returns>
    /// <response code="204">Symbol deleted successfully.</response>
    /// <response code="401">User is not authenticated.</response>
    /// <response code="403">User is not an administrator.</response>
    /// <response code="404">Symbol not found.</response>
    /// <response code="500">An internal server error occurred.</response>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> DeleteSymbolAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (!IsAdmin())
            {
                _logger.LogWarning("Non-admin user attempted to delete symbol {SymbolId}.", id);
                return Forbid();
            }

            var symbol = await _symbolRepository.GetByIdAsync(id, cancellationToken);
            if (symbol == null)
            {
                _logger.LogWarning("Symbol {SymbolId} not found.", id);
                return NotFound(new { message = "Symbol not found." });
            }

            _symbolRepository.Delete(symbol);
            await _symbolRepository.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Symbol {SymbolId} deleted by admin.", id);

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while deleting symbol {SymbolId}.", id);
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { message = "An error occurred while deleting the symbol." });
        }
    }

    // Helper methods

    private bool IsAdmin()
    {
        var roleClaim = User.FindFirstValue(ClaimTypes.Role);
        return !string.IsNullOrEmpty(roleClaim) && roleClaim.Equals(UserRole.Admin.ToString(), StringComparison.OrdinalIgnoreCase);
    }

    private SymbolDto MapSymbolToDto(Symbol symbol)
    {
        var previewImageUrl = symbol.PreviewImageBlobId.HasValue
            ? $"/api/symbols/{symbol.Id}/image"
            : null;

        return new SymbolDto
        {
            Id = symbol.Id,
            Code = symbol.Code,
            PreviewImageUrl = previewImageUrl,
            CreatedAt = symbol.CreatedAt
        };
    }

    [HttpGet("{id:guid}/image")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(FileResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetSymbolImageAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var symbol = await _symbolRepository.GetByIdAsync(id, cancellationToken);
        if (symbol?.PreviewImageBlobId == null) return NotFound();

        var blob = await _fileStorage.GetAsync(symbol.PreviewImageBlobId.Value, cancellationToken);
        if (blob == null) return NotFound();

        var etag = $"\"{blob.Sha256}\"";
        var ifNoneMatch = Request.Headers.IfNoneMatch.ToString();
        if (!string.IsNullOrEmpty(ifNoneMatch) && ifNoneMatch.Contains(etag, StringComparison.Ordinal))
            return StatusCode(StatusCodes.Status304NotModified);

        Response.Headers.ETag = etag;
        Response.Headers.CacheControl = "public, max-age=86400";
        return File(blob.Data, blob.ContentType);
    }
}
