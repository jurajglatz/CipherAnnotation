using CipherAnnotation.API.Extensions;
using CipherAnnotation.Core.Common;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace CipherAnnotation.Tests.Api;

public class ServiceResultExtensionsTests
{
    [Fact]
    public void ToActionResult_Generic_Success_ReturnsOkWithValue()
    {
        var result = ServiceResult<string>.Success("payload");

        var action = result.ToActionResult();

        var ok = action.Should().BeOfType<OkObjectResult>().Subject;
        ok.Value.Should().Be("payload");
    }

    [Fact]
    public void ToActionResult_NonGeneric_Success_ReturnsNoContent()
    {
        var action = ServiceResult.Success().ToActionResult();

        action.Should().BeOfType<NoContentResult>();
    }

    [Fact]
    public void ToCreatedResult_Success_Returns201()
    {
        var result = ServiceResult<int>.Success(42);

        var action = result.ToCreatedResult();

        var obj = action.Should().BeOfType<ObjectResult>().Subject;
        obj.StatusCode.Should().Be(StatusCodes.Status201Created);
        obj.Value.Should().Be(42);
    }

    [Fact]
    public void ToActionResult_NotFound_ReturnsNotFoundWithMessage()
    {
        var action = ServiceResult<string>.NotFound("missing").ToActionResult();

        var nf = action.Should().BeOfType<NotFoundObjectResult>().Subject;
        nf.Value.Should().BeEquivalentTo(new { message = "missing" });
    }

    [Fact]
    public void ToActionResult_Forbidden_ReturnsForbid()
    {
        ServiceResult.Forbidden().ToActionResult().Should().BeOfType<ForbidResult>();
        ServiceResult<int>.Forbidden().ToActionResult().Should().BeOfType<ForbidResult>();
    }

    [Fact]
    public void ToActionResult_BadRequest_ReturnsBadRequestWithMessage()
    {
        var action = ServiceResult.BadRequest("bad").ToActionResult();

        var br = action.Should().BeOfType<BadRequestObjectResult>().Subject;
        br.Value.Should().BeEquivalentTo(new { message = "bad" });
    }

    [Fact]
    public void ToActionResult_Unauthorized_ReturnsUnauthorized()
    {
        ServiceResult.Unauthorized().ToActionResult().Should().BeOfType<UnauthorizedResult>();
        ServiceResult<int>.Unauthorized().ToActionResult().Should().BeOfType<UnauthorizedResult>();
    }

    [Fact]
    public void ToCreatedResult_Error_FallsThroughToErrorMapping()
    {
        var action = ServiceResult<string>.NotFound("nope").ToCreatedResult();

        action.Should().BeOfType<NotFoundObjectResult>();
    }
}
