using System.Net;
using System.Text.Json;
using AssetBridge.Api.Middleware;
using AssetBridge.Application.Common.Models;
using AssetBridge.Domain.Exceptions;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace AssetBridge.UnitTests.Middleware;

public class GlobalExceptionHandlingMiddlewareTests
{
    private readonly Mock<ILogger<GlobalExceptionHandlingMiddleware>> _loggerMock = new();

    [Fact]
    public async Task InvokeAsync_ShouldReturnBadRequest_WhenValidationExceptionIsThrown()
    {
        // Arrange
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        var middleware = new GlobalExceptionHandlingMiddleware(
            _ => throw new ValidationException("Email", "Email format is invalid."),
            _loggerMock.Object);

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        context.Response.StatusCode.Should().Be((int)HttpStatusCode.BadRequest);

        context.Response.Body.Seek(0, SeekOrigin.Begin);
        using var reader = new StreamReader(context.Response.Body);
        var responseBody = await reader.ReadToEndAsync();

        var result = JsonSerializer.Deserialize<ApiResponse<object>>(responseBody, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        result.Should().NotBeNull();
        result!.Success.Should().BeFalse();
        result.Errors.Should().ContainKey("Email");
    }

    [Fact]
    public async Task InvokeAsync_ShouldReturnNotFound_WhenEntityNotFoundExceptionIsThrown()
    {
        // Arrange
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        var middleware = new GlobalExceptionHandlingMiddleware(
            _ => throw new EntityNotFoundException("User", Guid.NewGuid()),
            _loggerMock.Object);

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        context.Response.StatusCode.Should().Be((int)HttpStatusCode.NotFound);

        context.Response.Body.Seek(0, SeekOrigin.Begin);
        using var reader = new StreamReader(context.Response.Body);
        var responseBody = await reader.ReadToEndAsync();

        var result = JsonSerializer.Deserialize<ApiResponse<object>>(responseBody, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        result.Should().NotBeNull();
        result!.Success.Should().BeFalse();
        result.Message.Should().Contain("was not found");
    }
}
