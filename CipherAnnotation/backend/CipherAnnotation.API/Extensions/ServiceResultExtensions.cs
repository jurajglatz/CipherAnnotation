using CipherAnnotation.Core.Common;
using Microsoft.AspNetCore.Mvc;

namespace CipherAnnotation.API.Extensions;

public static class ServiceResultExtensions
{
    public static IActionResult ToActionResult<T>(this ServiceResult<T> result)
    {
        if (result.IsSuccess)
            return new OkObjectResult(result.Value);
        return MapError(result);
    }

    public static IActionResult ToActionResult(this ServiceResult result)
    {
        if (result.IsSuccess)
            return new NoContentResult();
        return MapError(result);
    }

    public static IActionResult ToCreatedResult<T>(this ServiceResult<T> result)
    {
        if (result.IsSuccess)
            return new ObjectResult(result.Value) { StatusCode = StatusCodes.Status201Created };
        return MapError(result);
    }

    private static IActionResult MapError(ServiceResult result) =>
        result.ErrorKind switch
        {
            ServiceErrorKind.NotFound => new NotFoundObjectResult(new { message = result.ErrorMessage ?? "Not found." }),
            ServiceErrorKind.Forbidden => new ForbidResult(),
            ServiceErrorKind.BadRequest => new BadRequestObjectResult(new { message = result.ErrorMessage }),
            ServiceErrorKind.Unauthorized => new UnauthorizedResult(),
            _ => new ObjectResult(new { message = result.ErrorMessage ?? "Unknown error." })
            {
                StatusCode = StatusCodes.Status500InternalServerError,
            },
        };
}
