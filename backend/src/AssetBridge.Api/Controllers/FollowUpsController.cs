using AssetBridge.Application.Common.Interfaces;
using AssetBridge.Application.Common.Models;
using AssetBridge.Application.DTOs.Workflow;
using AssetBridge.Application.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AssetBridge.Api.Controllers;

[Authorize]
[Route("api/follow-ups")]
public class FollowUpsController : BaseApiController
{
    private readonly IFollowUpService _followUpService;
    private readonly ICurrentUserService _currentUserService;

    public FollowUpsController(IFollowUpService followUpService, ICurrentUserService currentUserService)
    {
        _followUpService = followUpService;
        _currentUserService = currentUserService;
    }

    [HttpPost]
    [Authorize(Roles = "Manager,Admin,Representative")]
    [ProducesResponseType(typeof(ApiResponse<FollowUpTaskDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateFollowUp([FromBody] CreateFollowUpTaskDto request)
    {
        var currentUserId = _currentUserService.UserId ?? throw new UnauthorizedAccessException("User is not authenticated.");
        var currentUserRole = _currentUserService.Role?.ToString() ?? string.Empty;
        var result = await _followUpService.CreateFollowUpTaskAsync(request, currentUserId, currentUserRole);
        return HandleCreated($"/api/follow-ups/{result.Id}", result, "Continuity follow-up task scheduled successfully.");
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<FollowUpTaskDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetFollowUpById(Guid id)
    {
        var currentUserId = _currentUserService.UserId ?? throw new UnauthorizedAccessException("User is not authenticated.");
        var currentUserRole = _currentUserService.Role?.ToString() ?? string.Empty;
        var result = await _followUpService.GetFollowUpTaskByIdAsync(id, currentUserId, currentUserRole);

        if (result == null)
            return NotFound(ApiResponse<object>.FailureResult($"Follow-up task with ID '{id}' was not found."));

        return HandleSuccess(result, "Follow-up task retrieved successfully.");
    }

    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<PagedResponse<FollowUpTaskDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetFollowUps([FromQuery] FollowUpFilterParametersDto query)
    {
        var currentUserId = _currentUserService.UserId ?? throw new UnauthorizedAccessException("User is not authenticated.");
        var currentUserRole = _currentUserService.Role?.ToString() ?? string.Empty;
        var result = await _followUpService.GetFollowUpTasksAsync(query, currentUserId, currentUserRole);
        return HandleSuccess(result, "Follow-up tasks retrieved successfully.");
    }

    [HttpPatch("{id:guid}/status")]
    [ProducesResponseType(typeof(ApiResponse<FollowUpTaskDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateFollowUpStatus(Guid id, [FromBody] UpdateFollowUpStatusDto request)
    {
        var currentUserId = _currentUserService.UserId ?? throw new UnauthorizedAccessException("User is not authenticated.");
        var currentUserRole = _currentUserService.Role?.ToString() ?? string.Empty;
        var result = await _followUpService.UpdateFollowUpStatusAsync(id, request, currentUserId, currentUserRole);
        return HandleSuccess(result, "Follow-up status updated successfully.");
    }
}
