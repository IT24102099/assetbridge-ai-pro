using AssetBridge.Application.Common.Interfaces;
using AssetBridge.Application.Common.Models;
using AssetBridge.Application.DTOs.Ai;
using AssetBridge.Application.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AssetBridge.Api.Controllers;

[Authorize]
[Route("api/ai")]
public class AiController : BaseApiController
{
    private readonly IAiAssistantService _aiService;
    private readonly ICurrentUserService _currentUserService;

    public AiController(IAiAssistantService aiService, ICurrentUserService currentUserService)
    {
        _aiService = aiService;
        _currentUserService = currentUserService;
    }

    [HttpPost("chat")]
    [ProducesResponseType(typeof(ApiResponse<AiChatResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    [ProducesResponseType(StatusCodes.Status504GatewayTimeout)]
    public async Task<IActionResult> Chat([FromBody] AiChatRequestDto request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Message))
            return BadRequest(ApiResponse<object>.FailureResult("Message cannot be empty."));

        try
        {
            var result = await _aiService.ChatAsync(request, cancellationToken);
            return HandleSuccess(result, "AI Assistant response generated successfully.");
        }
        catch (HttpRequestException)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                ApiResponse<object>.FailureResult("AI Assistant service is currently offline or unreachable. Please verify microservice status and retry."));
        }
        catch (TimeoutException)
        {
            return StatusCode(StatusCodes.Status504GatewayTimeout,
                ApiResponse<object>.FailureResult("The AI Assistant request timed out. Please try again."));
        }
        catch (Exception)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                ApiResponse<object>.FailureResult("AI Assistant is temporarily unavailable. Please try again in a few moments."));
        }
    }

    [HttpPost("orchestrate")]
    [Authorize(Roles = "Manager,Admin")]
    [ProducesResponseType(typeof(ApiResponse<AiOrchestrationResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> OrchestrateWorkflow([FromBody] AiOrchestrationRequestDto request, CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId?.ToString() ?? "usr-mgr-001";
        var result = await _aiService.OrchestrateWorkflowAsync(request, currentUserId, cancellationToken);
        return HandleSuccess(result, "Multi-agent workflow orchestrated successfully.");
    }

    [HttpGet("documents")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<RagDocumentDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetDocuments(CancellationToken cancellationToken)
    {
        var result = await _aiService.GetDocumentsAsync(cancellationToken);
        return HandleSuccess(result, "RAG Knowledge base documents retrieved successfully.");
    }

    [HttpGet("documents/{documentId}/download")]
    public async Task<IActionResult> DownloadDocument(string documentId, CancellationToken cancellationToken)
    {
        try
        {
            var (bytes, contentType, fileName) = await _aiService.DownloadDocumentAsync(documentId, cancellationToken);
            var safeFileName = string.IsNullOrWhiteSpace(fileName) ? $"{documentId}.pdf" : fileName.Trim('"', ' ', '\'');
            if (!safeFileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
            {
                safeFileName += ".pdf";
            }
            Response.Headers.Append("Content-Disposition", $"attachment; filename=\"{safeFileName}\"");
            return File(bytes, "application/pdf", safeFileName);
        }
        catch (Exception)
        {
            return NotFound(ApiResponse<object>.FailureResult($"Knowledge document '{documentId}' was not found."));
        }
    }
}
