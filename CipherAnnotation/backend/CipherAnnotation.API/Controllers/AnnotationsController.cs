using AutoMapper;
using CipherAnnotation.Core.DTOs.Annotation;
using CipherAnnotation.Core.Entities;
using CipherAnnotation.Core.Enums;
using CipherAnnotation.Core.Interfaces;
using CipherAnnotation.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace CipherAnnotation.API.Controllers;

/// <summary>
/// API controller for annotation management (sections, pairs, and elements).
/// </summary>
[ApiController]
[Route("api/pages/{pageId:guid}/annotations")]
[Authorize]
public class AnnotationsController : ControllerBase
{
    private readonly IDocumentRepository _documentRepository;
    private readonly IMapper _mapper;
    private readonly ILogger<AnnotationsController> _logger;
    private readonly AppDbContext _dbContext;

    /// <summary>
    /// Initializes a new instance of the AnnotationsController.
    /// </summary>
    public AnnotationsController(
        IDocumentRepository documentRepository,
        IMapper mapper,
        ILogger<AnnotationsController> logger,
        AppDbContext dbContext)
    {
        _documentRepository = documentRepository ?? throw new ArgumentNullException(nameof(documentRepository));
        _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
    }

    #region Section Annotations

    /// <summary>
    /// Gets all section annotations for a page with nested pairs and elements.
    /// </summary>
    /// <param name="pageId">The page ID.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of section annotations with nested data.</returns>
    /// <response code="200">Section annotations retrieved successfully.</response>
    /// <response code="401">User is not authenticated.</response>
    /// <response code="403">User does not have access to this page.</response>
    /// <response code="404">Page not found.</response>
    /// <response code="500">An internal server error occurred.</response>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<SectionAnnotationDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<IEnumerable<SectionAnnotationDto>>> GetSectionAnnotationsAsync(
        Guid pageId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var page = await GetAndValidatePageAccessAsync(pageId, cancellationToken);
            if (page == null)
                return NotFound(new { message = "Page not found." });

            var sections = page.SectionAnnotations
                .OrderBy(s => s.CreatedAt)
                .Select(MapSectionToDto)
                .ToList();

            return Ok(sections);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while retrieving section annotations for page {PageId}.", pageId);
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { message = "An error occurred while retrieving section annotations." });
        }
    }

    /// <summary>
    /// Creates a new section annotation with a bounding box.
    /// </summary>
    /// <param name="pageId">The page ID.</param>
    /// <param name="request">The section creation request.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The created section annotation.</returns>
    /// <response code="201">Section annotation created successfully.</response>
    /// <response code="400">Invalid request.</response>
    /// <response code="401">User is not authenticated.</response>
    /// <response code="403">User does not have access to this page.</response>
    /// <response code="404">Page not found.</response>
    /// <response code="500">An internal server error occurred.</response>
    [HttpPost("sections")]
    [ProducesResponseType(typeof(SectionAnnotationDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<SectionAnnotationDto>> CreateSectionAsync(
        Guid pageId,
        [FromBody] CreateSectionRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var page = await GetAndValidatePageAccessAsync(pageId, cancellationToken);
            if (page == null)
                return NotFound(new { message = "Page not found." });

            var boundingBox = new BoundingBox
            {
                X = request.BoundingBox.X,
                Y = request.BoundingBox.Y,
                Width = request.BoundingBox.Width,
                Height = request.BoundingBox.Height
            };

            var section = new SectionAnnotation
            {
                PageId = pageId,
                Label = request.Label,
                Orientation = request.Orientation,
                BoundingBox = boundingBox,
                CreatedAt = DateTime.UtcNow
            };

            page.SectionAnnotations.Add(section);
            await _dbContext.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Section annotation {SectionId} created for page {PageId}.", section.Id, pageId);

            var sectionDto = MapSectionToDto(section);
            return StatusCode(StatusCodes.Status201Created, sectionDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while creating section annotation for page {PageId}.", pageId);
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { message = "An error occurred while creating the section annotation.", detail = ex.ToString() });
        }
    }

    /// <summary>
    /// Updates a section annotation.
    /// </summary>
    /// <param name="pageId">The page ID.</param>
    /// <param name="sectionId">The section annotation ID.</param>
    /// <param name="request">The update request.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The updated section annotation.</returns>
    /// <response code="200">Section annotation updated successfully.</response>
    /// <response code="400">Invalid request.</response>
    /// <response code="401">User is not authenticated.</response>
    /// <response code="403">User does not have access to this page.</response>
    /// <response code="404">Page or section not found.</response>
    /// <response code="500">An internal server error occurred.</response>
    [HttpPut("sections/{sectionId:guid}")]
    [ProducesResponseType(typeof(SectionAnnotationDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<SectionAnnotationDto>> UpdateSectionAsync(
        Guid pageId,
        Guid sectionId,
        [FromBody] UpdateAnnotationRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var page = await GetAndValidatePageAccessAsync(pageId, cancellationToken);
            if (page == null)
                return NotFound(new { message = "Page not found." });

            var section = page.SectionAnnotations.FirstOrDefault(s => s.Id == sectionId);
            if (section == null)
            {
                _logger.LogWarning("Section {SectionId} not found on page {PageId}.", sectionId, pageId);
                return NotFound(new { message = "Section not found." });
            }

            if (!string.IsNullOrEmpty(request.Label))
                section.Label = request.Label;
            if (request.Orientation.HasValue)
                section.Orientation = request.Orientation.Value;
            if (request.BoundingBox != null && section.BoundingBox != null)
            {
                section.BoundingBox.X = request.BoundingBox.X;
                section.BoundingBox.Y = request.BoundingBox.Y;
                section.BoundingBox.Width = request.BoundingBox.Width;
                section.BoundingBox.Height = request.BoundingBox.Height;
            }

            await _dbContext.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Section annotation {SectionId} updated.", sectionId);

            var sectionDto = MapSectionToDto(section);
            return Ok(sectionDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while updating section annotation {SectionId}.", sectionId);
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { message = "An error occurred while updating the section annotation." });
        }
    }

    /// <summary>
    /// Deletes a section annotation and all nested pairs and elements.
    /// </summary>
    /// <param name="pageId">The page ID.</param>
    /// <param name="sectionId">The section annotation ID.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>No content on success.</returns>
    /// <response code="204">Section annotation deleted successfully.</response>
    /// <response code="401">User is not authenticated.</response>
    /// <response code="403">User does not have access to this page.</response>
    /// <response code="404">Page or section not found.</response>
    /// <response code="500">An internal server error occurred.</response>
    [HttpDelete("sections/{sectionId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> DeleteSectionAsync(
        Guid pageId,
        Guid sectionId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var page = await GetAndValidatePageAccessAsync(pageId, cancellationToken);
            if (page == null)
                return NotFound(new { message = "Page not found." });

            var section = page.SectionAnnotations.FirstOrDefault(s => s.Id == sectionId);
            if (section == null)
            {
                _logger.LogWarning("Section {SectionId} not found on page {PageId}.", sectionId, pageId);
                return NotFound(new { message = "Section not found." });
            }

            page.SectionAnnotations.Remove(section);
            await _dbContext.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Section annotation {SectionId} deleted.", sectionId);

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while deleting section annotation {SectionId}.", sectionId);
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { message = "An error occurred while deleting the section annotation." });
        }
    }

    #endregion

    #region Pair Annotations

    /// <summary>
    /// Creates a new pair annotation within a section.
    /// </summary>
    /// <param name="pageId">The page ID.</param>
    /// <param name="sectionId">The section annotation ID.</param>
    /// <param name="request">The pair creation request.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The created pair annotation.</returns>
    /// <response code="201">Pair annotation created successfully.</response>
    /// <response code="400">Invalid request.</response>
    /// <response code="401">User is not authenticated.</response>
    /// <response code="403">User does not have access to this page.</response>
    /// <response code="404">Page or section not found.</response>
    /// <response code="500">An internal server error occurred.</response>
    [HttpPost("sections/{sectionId:guid}/pairs")]
    [ProducesResponseType(typeof(PairAnnotationDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<PairAnnotationDto>> CreatePairAsync(
        Guid pageId,
        Guid sectionId,
        [FromBody] CreatePairRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var page = await GetAndValidatePageAccessAsync(pageId, cancellationToken);
            if (page == null)
                return NotFound(new { message = "Page not found." });

            var section = page.SectionAnnotations.FirstOrDefault(s => s.Id == sectionId);
            if (section == null)
                return NotFound(new { message = "Section not found." });

            var boundingBox = new BoundingBox
            {
                X = request.BoundingBox.X,
                Y = request.BoundingBox.Y,
                Width = request.BoundingBox.Width,
                Height = request.BoundingBox.Height
            };

            var pair = new PairAnnotation
            {
                SectionId = sectionId,
                Order = request.Order,
                Orientation = request.Orientation,
                BoundingBox = boundingBox,
                CreatedAt = DateTime.UtcNow
            };

            section.PairAnnotations.Add(pair);
            await _dbContext.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Pair annotation {PairId} created in section {SectionId}.", pair.Id, sectionId);

            var pairDto = MapPairToDto(pair);
            return StatusCode(StatusCodes.Status201Created, pairDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while creating pair annotation in section {SectionId}.", sectionId);
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { message = "An error occurred while creating the pair annotation.", detail = ex.ToString() });
        }
    }

    /// <summary>
    /// Updates a pair annotation.
    /// </summary>
    /// <param name="pageId">The page ID.</param>
    /// <param name="pairId">The pair annotation ID.</param>
    /// <param name="request">The update request.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The updated pair annotation.</returns>
    /// <response code="200">Pair annotation updated successfully.</response>
    /// <response code="400">Invalid request.</response>
    /// <response code="401">User is not authenticated.</response>
    /// <response code="403">User does not have access to this page.</response>
    /// <response code="404">Page or pair not found.</response>
    /// <response code="500">An internal server error occurred.</response>
    [HttpPut("pairs/{pairId:guid}")]
    [ProducesResponseType(typeof(PairAnnotationDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<PairAnnotationDto>> UpdatePairAsync(
        Guid pageId,
        Guid pairId,
        [FromBody] UpdateAnnotationRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var page = await GetAndValidatePageAccessAsync(pageId, cancellationToken);
            if (page == null)
                return NotFound(new { message = "Page not found." });

            var pair = page.SectionAnnotations
                .SelectMany(s => s.PairAnnotations)
                .FirstOrDefault(p => p.Id == pairId);
            if (pair == null)
            {
                _logger.LogWarning("Pair {PairId} not found on page {PageId}.", pairId, pageId);
                return NotFound(new { message = "Pair not found." });
            }

            if (request.Order.HasValue)
                pair.Order = request.Order.Value;
            if (request.Orientation.HasValue)
                pair.Orientation = request.Orientation.Value;
            if (request.BoundingBox != null && pair.BoundingBox != null)
            {
                pair.BoundingBox.X = request.BoundingBox.X;
                pair.BoundingBox.Y = request.BoundingBox.Y;
                pair.BoundingBox.Width = request.BoundingBox.Width;
                pair.BoundingBox.Height = request.BoundingBox.Height;
            }
            if (request.SectionId.HasValue && request.SectionId.Value != pair.SectionId)
            {
                var targetSection = page.SectionAnnotations
                    .FirstOrDefault(s => s.Id == request.SectionId.Value);
                if (targetSection == null)
                    return BadRequest(new { message = "Target section not found on this page." });
                pair.SectionId = targetSection.Id;
                pair.Section = targetSection;
            }

            await _dbContext.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Pair annotation {PairId} updated.", pairId);

            var pairDto = MapPairToDto(pair);
            return Ok(pairDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while updating pair annotation {PairId}.", pairId);
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { message = "An error occurred while updating the pair annotation." });
        }
    }

    /// <summary>
    /// Deletes a pair annotation and all nested elements.
    /// </summary>
    /// <param name="pageId">The page ID.</param>
    /// <param name="pairId">The pair annotation ID.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>No content on success.</returns>
    /// <response code="204">Pair annotation deleted successfully.</response>
    /// <response code="401">User is not authenticated.</response>
    /// <response code="403">User does not have access to this page.</response>
    /// <response code="404">Page or pair not found.</response>
    /// <response code="500">An internal server error occurred.</response>
    [HttpDelete("pairs/{pairId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> DeletePairAsync(
        Guid pageId,
        Guid pairId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var page = await GetAndValidatePageAccessAsync(pageId, cancellationToken);
            if (page == null)
                return NotFound(new { message = "Page not found." });

            var pair = page.SectionAnnotations
                .SelectMany(s => s.PairAnnotations)
                .FirstOrDefault(p => p.Id == pairId);
            if (pair == null)
            {
                _logger.LogWarning("Pair {PairId} not found on page {PageId}.", pairId, pageId);
                return NotFound(new { message = "Pair not found." });
            }

            var section = page.SectionAnnotations.First(s => s.PairAnnotations.Contains(pair));
            section.PairAnnotations.Remove(pair);
            await _dbContext.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Pair annotation {PairId} deleted.", pairId);

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while deleting pair annotation {PairId}.", pairId);
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { message = "An error occurred while deleting the pair annotation." });
        }
    }

    #endregion

    #region Element Annotations

    /// <summary>
    /// Creates a new element annotation within a pair.
    /// </summary>
    /// <param name="pageId">The page ID.</param>
    /// <param name="pairId">The pair annotation ID.</param>
    /// <param name="request">The element creation request.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The created element annotation.</returns>
    /// <response code="201">Element annotation created successfully.</response>
    /// <response code="400">Invalid request.</response>
    /// <response code="401">User is not authenticated.</response>
    /// <response code="403">User does not have access to this page.</response>
    /// <response code="404">Page or pair not found.</response>
    /// <response code="500">An internal server error occurred.</response>
    [HttpPost("pairs/{pairId:guid}/elements")]
    [ProducesResponseType(typeof(ElementAnnotationDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<ElementAnnotationDto>> CreateElementAsync(
        Guid pageId,
        Guid pairId,
        [FromBody] CreateElementRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var page = await GetAndValidatePageAccessAsync(pageId, cancellationToken);
            if (page == null)
                return NotFound(new { message = "Page not found." });

            var pair = page.SectionAnnotations
                .SelectMany(s => s.PairAnnotations)
                .FirstOrDefault(p => p.Id == pairId);
            if (pair == null)
                return NotFound(new { message = "Pair not found." });

            var elementType = Enum.TryParse<ElementType>(request.Type, out var type)
                ? type
                : ElementType.Plaintext;

            var boundingBox = new BoundingBox
            {
                X = request.BoundingBox.X,
                Y = request.BoundingBox.Y,
                Width = request.BoundingBox.Width,
                Height = request.BoundingBox.Height
            };

            var element = new ElementAnnotation
            {
                PairId = pairId,
                SymbolId = request.SymbolId,
                Type = elementType,
                Content = request.Content,
                Transcription = request.Transcription,
                Orientation = request.Orientation,
                BoundingBox = boundingBox,
                CreatedAt = DateTime.UtcNow
            };

            pair.ElementAnnotations.Add(element);
            await _dbContext.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Element annotation {ElementId} created in pair {PairId}.", element.Id, pairId);

            var elementDto = MapElementToDto(element);
            return StatusCode(StatusCodes.Status201Created, elementDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while creating element annotation in pair {PairId}.", pairId);
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { message = "An error occurred while creating the element annotation.", detail = ex.ToString() });
        }
    }

    /// <summary>
    /// Updates an element annotation.
    /// </summary>
    /// <param name="pageId">The page ID.</param>
    /// <param name="elementId">The element annotation ID.</param>
    /// <param name="request">The update request.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The updated element annotation.</returns>
    /// <response code="200">Element annotation updated successfully.</response>
    /// <response code="400">Invalid request.</response>
    /// <response code="401">User is not authenticated.</response>
    /// <response code="403">User does not have access to this page.</response>
    /// <response code="404">Page or element not found.</response>
    /// <response code="500">An internal server error occurred.</response>
    [HttpPut("elements/{elementId:guid}")]
    [ProducesResponseType(typeof(ElementAnnotationDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<ElementAnnotationDto>> UpdateElementAsync(
        Guid pageId,
        Guid elementId,
        [FromBody] UpdateAnnotationRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var page = await GetAndValidatePageAccessAsync(pageId, cancellationToken);
            if (page == null)
                return NotFound(new { message = "Page not found." });

            var element = page.SectionAnnotations
                .SelectMany(s => s.PairAnnotations)
                .SelectMany(p => p.ElementAnnotations)
                .FirstOrDefault(e => e.Id == elementId);
            if (element == null)
            {
                _logger.LogWarning("Element {ElementId} not found on page {PageId}.", elementId, pageId);
                return NotFound(new { message = "Element not found." });
            }

            if (request.Type != null && Enum.TryParse<ElementType>(request.Type, out var parsedType))
            {
                element.Type = parsedType;
                if (parsedType == ElementType.Plaintext)
                    element.SymbolId = null;
            }
            if (request.Content != null)
                element.Content = request.Content;
            if (request.Transcription != null)
                element.Transcription = request.Transcription;
            if (request.Orientation.HasValue)
                element.Orientation = request.Orientation.Value;
            if (request.SymbolId.HasValue)
                element.SymbolId = request.SymbolId;
            if (request.BoundingBox != null && element.BoundingBox != null)
            {
                element.BoundingBox.X = request.BoundingBox.X;
                element.BoundingBox.Y = request.BoundingBox.Y;
                element.BoundingBox.Width = request.BoundingBox.Width;
                element.BoundingBox.Height = request.BoundingBox.Height;
            }
            if (request.PairId.HasValue && request.PairId.Value != element.PairId)
            {
                var targetPair = page.SectionAnnotations
                    .SelectMany(s => s.PairAnnotations)
                    .FirstOrDefault(p => p.Id == request.PairId.Value);
                if (targetPair == null)
                    return BadRequest(new { message = "Target pair not found on this page." });
                element.PairId = targetPair.Id;
                element.Pair = targetPair;
            }

            await _dbContext.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Element annotation {ElementId} updated.", elementId);

            var elementDto = MapElementToDto(element);
            return Ok(elementDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while updating element annotation {ElementId}.", elementId);
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { message = "An error occurred while updating the element annotation." });
        }
    }

    /// <summary>
    /// Deletes an element annotation.
    /// </summary>
    /// <param name="pageId">The page ID.</param>
    /// <param name="elementId">The element annotation ID.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>No content on success.</returns>
    /// <response code="204">Element annotation deleted successfully.</response>
    /// <response code="401">User is not authenticated.</response>
    /// <response code="403">User does not have access to this page.</response>
    /// <response code="404">Page or element not found.</response>
    /// <response code="500">An internal server error occurred.</response>
    [HttpDelete("elements/{elementId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> DeleteElementAsync(
        Guid pageId,
        Guid elementId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var page = await GetAndValidatePageAccessAsync(pageId, cancellationToken);
            if (page == null)
                return NotFound(new { message = "Page not found." });

            var element = page.SectionAnnotations
                .SelectMany(s => s.PairAnnotations)
                .SelectMany(p => p.ElementAnnotations)
                .FirstOrDefault(e => e.Id == elementId);
            if (element == null)
            {
                _logger.LogWarning("Element {ElementId} not found on page {PageId}.", elementId, pageId);
                return NotFound(new { message = "Element not found." });
            }

            var pair = page.SectionAnnotations
                .SelectMany(s => s.PairAnnotations)
                .First(p => p.ElementAnnotations.Contains(element));
            pair.ElementAnnotations.Remove(element);
            await _dbContext.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Element annotation {ElementId} deleted.", elementId);

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while deleting element annotation {ElementId}.", elementId);
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { message = "An error occurred while deleting the element annotation." });
        }
    }

    #endregion

    #region Bounding Box

    /// <summary>
    /// Updates a bounding box position and size directly.
    /// </summary>
    /// <param name="pageId">The page ID.</param>
    /// <param name="boxId">The bounding box ID.</param>
    /// <param name="request">The bounding box update request.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The updated bounding box.</returns>
    /// <response code="200">Bounding box updated successfully.</response>
    /// <response code="400">Invalid request.</response>
    /// <response code="401">User is not authenticated.</response>
    /// <response code="403">User does not have access to this page.</response>
    /// <response code="404">Page or bounding box not found.</response>
    /// <response code="500">An internal server error occurred.</response>
    [HttpPut("boundingboxes/{boxId:guid}")]
    [ProducesResponseType(typeof(BoundingBoxDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<BoundingBoxDto>> UpdateBoundingBoxAsync(
        Guid pageId,
        Guid boxId,
        [FromBody] BoundingBoxDto request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var page = await GetAndValidatePageAccessAsync(pageId, cancellationToken);
            if (page == null)
                return NotFound(new { message = "Page not found." });

            // Find bounding box by annotation ID (section, pair, or element)
            BoundingBox? boundingBox = null;

            var section = page.SectionAnnotations.FirstOrDefault(s => s.Id == boxId);
            if (section != null)
            {
                boundingBox = section.BoundingBox;
            }
            else
            {
                var pair = page.SectionAnnotations
                    .SelectMany(s => s.PairAnnotations)
                    .FirstOrDefault(p => p.Id == boxId);
                if (pair != null)
                {
                    boundingBox = pair.BoundingBox;
                }
                else
                {
                    var element = page.SectionAnnotations
                        .SelectMany(s => s.PairAnnotations)
                        .SelectMany(p => p.ElementAnnotations)
                        .FirstOrDefault(e => e.Id == boxId);
                    if (element != null)
                    {
                        boundingBox = element.BoundingBox;
                    }
                }
            }

            if (boundingBox == null)
            {
                _logger.LogWarning("Bounding box {BoxId} not found on page {PageId}.", boxId, pageId);
                return NotFound(new { message = "Bounding box not found." });
            }

            boundingBox.X = request.X;
            boundingBox.Y = request.Y;
            boundingBox.Width = request.Width;
            boundingBox.Height = request.Height;

            await _dbContext.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Bounding box {BoxId} updated.", boxId);

            var boxDto = new BoundingBoxDto
            {
                X = boundingBox.X,
                Y = boundingBox.Y,
                Width = boundingBox.Width,
                Height = boundingBox.Height
            };
            return Ok(boxDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while updating bounding box {BoxId}.", boxId);
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { message = "An error occurred while updating the bounding box." });
        }
    }

    #endregion

    // Helper methods

    private async Task<Page?> GetAndValidatePageAccessAsync(Guid pageId, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        var page = await _dbContext.Pages
            .Include(p => p.Document)
                .ThenInclude(d => d.Shares)
            .Include(p => p.SectionAnnotations)
                .ThenInclude(s => s.BoundingBox)
            .Include(p => p.SectionAnnotations)
                .ThenInclude(s => s.PairAnnotations)
                    .ThenInclude(p => p.BoundingBox)
            .Include(p => p.SectionAnnotations)
                .ThenInclude(s => s.PairAnnotations)
                    .ThenInclude(p => p.ElementAnnotations)
                        .ThenInclude(e => e.BoundingBox)
            .FirstOrDefaultAsync(p => p.Id == pageId, cancellationToken);

        if (page == null)
            return null;

        if (!CanAccessDocument(page.Document!, userId))
        {
            _logger.LogWarning("User {UserId} attempted to access page {PageId} without permission.", userId, pageId);
            return null;
        }

        return page;
    }

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(userIdClaim, out var userId) ? userId : Guid.Empty;
    }

    private bool CanAccessDocument(Document document, Guid userId)
    {
        return document.OwnerId == userId ||
               document.Visibility == Visibility.Public ||
               document.Shares.Any(s => s.UserId == userId);
    }

    private SectionAnnotationDto MapSectionToDto(SectionAnnotation section)
    {
        return new SectionAnnotationDto
        {
            Id = section.Id,
            PageId = section.PageId,
            Label = section.Label,
            Orientation = section.Orientation,
            BoundingBox = section.BoundingBox != null
                ? new BoundingBoxDto
                {
                    X = section.BoundingBox.X,
                    Y = section.BoundingBox.Y,
                    Width = section.BoundingBox.Width,
                    Height = section.BoundingBox.Height
                }
                : new BoundingBoxDto { X = 0, Y = 0, Width = 0, Height = 0 },
            CreatedAt = section.CreatedAt,
            PairAnnotations = section.PairAnnotations.Select(MapPairToDto).ToList()
        };
    }

    private PairAnnotationDto MapPairToDto(PairAnnotation pair)
    {
        return new PairAnnotationDto
        {
            Id = pair.Id,
            SectionId = pair.SectionId,
            Order = pair.Order,
            Orientation = pair.Orientation,
            BoundingBox = pair.BoundingBox != null
                ? new BoundingBoxDto
                {
                    X = pair.BoundingBox.X,
                    Y = pair.BoundingBox.Y,
                    Width = pair.BoundingBox.Width,
                    Height = pair.BoundingBox.Height
                }
                : new BoundingBoxDto { X = 0, Y = 0, Width = 0, Height = 0 },
            CreatedAt = pair.CreatedAt,
            ElementAnnotations = pair.ElementAnnotations.Select(MapElementToDto).ToList()
        };
    }

    private ElementAnnotationDto MapElementToDto(ElementAnnotation element)
    {
        return new ElementAnnotationDto
        {
            Id = element.Id,
            PairId = element.PairId,
            SymbolId = element.SymbolId,
            Type = element.Type.ToString(),
            Content = element.Content,
            Transcription = element.Transcription,
            Orientation = element.Orientation,
            BoundingBox = element.BoundingBox != null
                ? new BoundingBoxDto
                {
                    X = element.BoundingBox.X,
                    Y = element.BoundingBox.Y,
                    Width = element.BoundingBox.Width,
                    Height = element.BoundingBox.Height
                }
                : new BoundingBoxDto { X = 0, Y = 0, Width = 0, Height = 0 },
            SymbolCode = element.Symbol?.Code,
            CreatedAt = element.CreatedAt
        };
    }
}
