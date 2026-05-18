using System.Security.Claims;
using CipherAnnotation.Core.DTOs.Auth;
using CipherAnnotation.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CipherAnnotation.API.Controllers;

/// <summary>
/// API controller for user lookups (e.g. autocomplete in the share dialog).
/// </summary>
[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController : ControllerBase
{
    private const int MinQueryLength = 2;
    private const int DefaultLimit = 10;
    private const int MaxLimit = 20;

    private readonly AppDbContext _dbContext;
    private readonly ILogger<UsersController> _logger;

    public UsersController(AppDbContext dbContext, ILogger<UsersController> logger)
    {
        _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Searches users by name or email for the share-document autocomplete.
    /// </summary>
    /// <param name="q">The search query (minimum 2 characters).</param>
    /// <param name="limit">The maximum number of results (default 10, max 20).</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    [HttpGet("search")]
    [ProducesResponseType(typeof(IEnumerable<UserDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<IEnumerable<UserDto>>> SearchAsync(
        [FromQuery] string q,
        [FromQuery] int limit = DefaultLimit,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(q) || q.Trim().Length < MinQueryLength)
        {
            return Ok(Array.Empty<UserDto>());
        }

        var clampedLimit = Math.Clamp(limit, 1, MaxLimit);

        Guid? currentUserId = null;
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (Guid.TryParse(userIdClaim, out var parsedUserId))
        {
            currentUserId = parsedUserId;
        }

        try
        {
            var normalized = q.Trim().ToLower();
            var query = _dbContext.Users.AsNoTracking()
                .Where(u =>
                    u.Email.ToLower().Contains(normalized) ||
                    u.Name.ToLower().Contains(normalized));

            if (currentUserId.HasValue)
                query = query.Where(u => u.Id != currentUserId.Value);

            var users = await query
                .OrderBy(u => u.Name)
                .Take(clampedLimit)
                .ToListAsync(cancellationToken);

            var result = users.Select(u => new UserDto
            {
                Id = u.Id,
                Email = u.Email,
                Name = u.Name,
                AvatarUri = u.AvatarUri
            });

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while searching users with query {Query}.", q);
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { message = "An error occurred while searching users." });
        }
    }
}
