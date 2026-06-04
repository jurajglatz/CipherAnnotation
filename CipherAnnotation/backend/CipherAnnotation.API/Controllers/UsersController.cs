using System.Security.Claims;
using CipherAnnotation.Core.DTOs.Auth;
using CipherAnnotation.Core.Enums;
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

/// <summary>Request body for changing a user's role.</summary>
public record UpdateRoleRequest(string Role);

/// <summary>Paginated user list response (matches the frontend PaginatedResponse&lt;T&gt;).</summary>
public record PagedUsersResponse
{
    public required IReadOnlyList<UserDto> Data { get; init; }
    public required int Total { get; init; }
    public required int Page { get; init; }
    public required int PageSize { get; init; }
}

/// <summary>Admin-only user management: list users and change their roles.</summary>
[ApiController]
[Route("api/admin/users")]
[Authorize(Roles = nameof(UserRole.Admin))]
public class AdminUsersController : ControllerBase
{
    private const int MaxPageSize = 50;

    private readonly AppDbContext _dbContext;
    private readonly ILogger<AdminUsersController> _logger;

    public AdminUsersController(AppDbContext dbContext, ILogger<AdminUsersController> logger)
    {
        _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    [HttpGet]
    [ProducesResponseType(typeof(PagedUsersResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedUsersResponse>> ListAsync(
        [FromQuery] string? q,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        var safePage = Math.Max(page, 1);
        var safePageSize = Math.Clamp(pageSize, 1, MaxPageSize);

        var query = _dbContext.Users.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(q))
        {
            var normalized = q.Trim().ToLower();
            query = query.Where(u =>
                u.Email.ToLower().Contains(normalized) ||
                u.Name.ToLower().Contains(normalized));
        }

        var total = await query.CountAsync(cancellationToken);
        var users = await query
            .OrderBy(u => u.Name)
            .Skip((safePage - 1) * safePageSize)
            .Take(safePageSize)
            .Select(u => new UserDto
            {
                Id = u.Id,
                Email = u.Email,
                Name = u.Name,
                AvatarUri = u.AvatarUri,
                Role = u.Role,
                CreatedAt = u.CreatedAt,
            })
            .ToListAsync(cancellationToken);

        return Ok(new PagedUsersResponse
        {
            Data = users,
            Total = total,
            Page = safePage,
            PageSize = safePageSize,
        });
    }

    [HttpPut("{id:guid}/role")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateRoleAsync(
        Guid id,
        [FromBody] UpdateRoleRequest body,
        CancellationToken cancellationToken = default)
    {
        if (body is null || string.IsNullOrWhiteSpace(body.Role) ||
            !Enum.TryParse<UserRole>(body.Role, ignoreCase: true, out var role))
        {
            return BadRequest(new { message = "A valid role ('User' or 'Admin') is required." });
        }

        var callerId = Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var cid) ? cid : Guid.Empty;
        if (id == callerId)
        {
            return BadRequest(new { message = "You cannot change your own role." });
        }

        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
        if (user is null)
        {
            return NotFound(new { message = "User not found." });
        }

        user.Role = role;
        await _dbContext.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Admin {CallerId} changed role of user {UserId} to {Role}.", callerId, id, role);
        return NoContent();
    }
}
