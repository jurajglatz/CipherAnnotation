using System.Security.Claims;
using CipherAnnotation.Core.Enums;
using CipherAnnotation.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CipherAnnotation.API.Controllers;

[ApiController]
[Route("api/settings")]
public class SettingsController : ControllerBase
{
    private readonly IAppSettingsService _settings;

    public SettingsController(IAppSettingsService settings)
    {
        _settings = settings;
    }

    /// <summary>
    /// Returns the subset of settings safe to expose to any authenticated user.
    /// The frontend uses this to know whether to show the "Suggest content" UI.
    /// </summary>
    [HttpGet("public")]
    [Authorize]
    public async Task<IActionResult> GetPublicAsync(CancellationToken ct)
    {
        var autoContentGenerator = await _settings.GetBoolAsync(
            AppSettingKeys.AutoContentGeneratorEnabled, defaultValue: false, ct);

        return Ok(new
        {
            autoContentGenerator,
        });
    }
}

[ApiController]
[Route("api/admin/settings")]
[Authorize(Roles = nameof(UserRole.Admin))]
public class AdminSettingsController : ControllerBase
{
    private readonly IAppSettingsService _settings;

    public AdminSettingsController(IAppSettingsService settings)
    {
        _settings = settings;
    }

    public record UpdateSettingRequest(string Value);

    [HttpGet]
    public async Task<IActionResult> GetAllAsync(CancellationToken ct)
    {
        var all = await _settings.GetAllAsync(ct);
        return Ok(all);
    }

    [HttpPut("{key}")]
    public async Task<IActionResult> SetAsync(string key, [FromBody] UpdateSettingRequest body, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(key) || body is null || body.Value is null)
            return BadRequest(new { message = "Key and value are required." });

        Guid? userId = Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;
        await _settings.SetAsync(key, body.Value, userId, ct);
        return NoContent();
    }
}
