using System.Net;
using System.Text.Json;
using AssetBridge.Application.Common.Models;
using AssetBridge.Domain.Exceptions;

namespace AssetBridge.Api.Middleware;

// Intercepts all unhandled exceptions across the HTTP pipeline.
// Translates domain and system exceptions into standardized, consistent JSON responses (ApiResponse<object>).
// Prevents sensitive stack traces and database internal details from leaking to clients in production.
public class GlobalExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionHandlingMiddleware> _logger;

    public GlobalExceptionHandlingMiddleware(RequestDelegate next, ILogger<GlobalExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var response = context.Response;
        response.ContentType = "application/json";

        var (statusCode, message, errors) = exception switch
        {
            ValidationException validationEx => (
                HttpStatusCode.BadRequest,
                validationEx.Message,
                validationEx.Errors),

            EntityNotFoundException notFoundEx => (
                HttpStatusCode.NotFound,
                notFoundEx.Message,
                null),

            UnauthorizedAccessException => (
                HttpStatusCode.Unauthorized,
                "You are not authorized to access this resource.",
                null),

            DomainException domainEx => (
                HttpStatusCode.UnprocessableEntity,
                domainEx.Message,
                null),

            _ => (
                HttpStatusCode.InternalServerError,
                "An unexpected server error occurred. Please try again later or contact support.",
                null)
        };

        if (statusCode == HttpStatusCode.InternalServerError)
        {
            _logger.LogError(exception, "Unhandled Exception caught by GlobalExceptionMiddleware: {Message}", exception.Message);
        }
        else
        {
            _logger.LogWarning("Handled Exception ({StatusCode}): {Message}", statusCode, exception.Message);
        }

        response.StatusCode = (int)statusCode;

        var apiResponse = ApiResponse<object>.FailureResult(message, errors);

        var jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = false
        };

        await response.WriteAsync(JsonSerializer.Serialize(apiResponse, jsonOptions));
    }
}
