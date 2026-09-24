using AssetBridge.Application.Common.Models;
using AssetBridge.Application.DTOs.Maintenance;
using AssetBridge.Application.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AssetBridge.Api.Controllers;

[Authorize]
[Route("api/assets/{assetId:guid}/maintenance-history")]
public class MaintenanceHistoryController : BaseApiController
{
    private readonly IMaintenanceHistoryService _historyService;

    public MaintenanceHistoryController(IMaintenanceHistoryService historyService)
    {
        _historyService = historyService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<MaintenanceHistoryResponseDto>>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetHistory(Guid assetId, CancellationToken cancellationToken)
    {
        var result = await _historyService.GetHistoryByAssetIdAsync(assetId, cancellationToken);
        return HandleSuccess(result, "Asset maintenance history retrieved successfully.");
    }

    [HttpPost]
    [Authorize(Roles = "Manager,Admin,ServiceProvider")]
    [ProducesResponseType(typeof(ApiResponse<MaintenanceHistoryResponseDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RecordHistory(Guid assetId, [FromBody] RecordMaintenanceHistoryRequestDto request, CancellationToken cancellationToken)
    {
        request.AssetId = assetId;
        var result = await _historyService.RecordHistoryAsync(request, cancellationToken);
        return HandleCreated($"/api/assets/{assetId}/maintenance-history/{result.Id}", result, "Maintenance history recorded successfully.");
    }
}
