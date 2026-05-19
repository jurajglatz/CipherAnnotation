using CipherAnnotation.API.Extensions;
using CipherAnnotation.Core.DTOs.Symbol;
using CipherAnnotation.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CipherAnnotation.API.Controllers;

[ApiController]
[Route("api/symbols/auto-fill-jobs")]
[Authorize]
public class AutoFillJobsController : ControllerBase
{
    private readonly IAutoFillJobService _jobs;

    public AutoFillJobsController(IAutoFillJobService jobs)
    {
        _jobs = jobs;
    }

    [HttpPost]
    [ProducesResponseType(typeof(StartAutoFillJobResponse), StatusCodes.Status202Accepted)]
    public async Task<IActionResult> StartAsync(
        [FromBody] AutoFillContentRequest request, CancellationToken ct = default)
    {
        if (request is null || request.Id == Guid.Empty)
            return BadRequest(new { message = "scope and id are required." });

        var result = await _jobs.StartAsync(request.Scope, request.Id, User.GetUserId(), ct);
        if (!result.IsSuccess) return result.ToActionResult();
        return Accepted(result.Value);
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<AutoFillJobDto>), StatusCodes.Status200OK)]
    public IActionResult List()
    {
        var result = _jobs.List(User.GetUserId());
        return result.ToActionResult();
    }

    [HttpDelete("{jobId:guid}")]
    public IActionResult Dismiss(Guid jobId)
    {
        var result = _jobs.Dismiss(jobId, User.GetUserId());
        return result.ToActionResult();
    }

    [HttpDelete]
    public IActionResult DismissAllCompleted()
    {
        var result = _jobs.DismissAllCompleted(User.GetUserId());
        return result.ToActionResult();
    }
}
