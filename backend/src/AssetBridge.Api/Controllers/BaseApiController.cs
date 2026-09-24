using AssetBridge.Application.Common.Models;
using Microsoft.AspNetCore.Mvc;

namespace AssetBridge.Api.Controllers;

// Serves as the base API controller for all AssetBridge AI endpoints.
// Standardizes route prefixing ('/api/[controller]'), model validation enforcement,
// and uniform JSON response helpers.
[ApiController]
[Route("api/[controller]")]
public abstract class BaseApiController : ControllerBase
{
    protected IActionResult HandleSuccess<T>(T data, string message = "Operation completed successfully.")
    {
        return Ok(ApiResponse<T>.SuccessResult(data, message));
    }

    protected IActionResult HandleCreated<T>(string uri, T data, string message = "Resource created successfully.")
    {
        return Created(uri, ApiResponse<T>.SuccessResult(data, message));
    }

    protected IActionResult HandleFailure<T>(string message, IDictionary<string, string[]>? errors = null, int statusCode = 400)
    {
        return StatusCode(statusCode, ApiResponse<T>.FailureResult(message, errors));
    }
}
