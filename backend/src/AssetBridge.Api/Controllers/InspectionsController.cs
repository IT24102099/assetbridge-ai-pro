using AssetBridge.Application.Common.Models;
using AssetBridge.Application.DTOs.Inspections;
using AssetBridge.Application.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AssetBridge.Api.Controllers;

[Authorize]
public class InspectionsController : BaseApiController
{
    private readonly IInspectionService _inspectionService;
    private readonly IInspectionFindingService _findingService;

    public InspectionsController(
        IInspectionService inspectionService,
        IInspectionFindingService findingService)
    {
        _inspectionService = inspectionService;
        _findingService = findingService;
    }

    #region Inspection Management

    [HttpPost]
    [Authorize(Roles = "ServiceProvider,Manager,Admin")]
    [ProducesResponseType(typeof(ApiResponse<InspectionResponseDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> CreateInspection([FromBody] CreateInspectionRequestDto request, CancellationToken cancellationToken)
    {
        var result = await _inspectionService.CreateInspectionAsync(request, cancellationToken);
        return HandleCreated($"/api/inspections/{result.Id}", result, "Inspection scheduled successfully.");
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<InspectionResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetInspectionById(Guid id, CancellationToken cancellationToken)
    {
        var result = await _inspectionService.GetInspectionByIdAsync(id, cancellationToken);
        return HandleSuccess(result, "Inspection retrieved successfully.");
    }

    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<PagedResponse<InspectionResponseDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetInspections([FromQuery] InspectionQueryParametersDto query, CancellationToken cancellationToken)
    {
        var result = await _inspectionService.GetInspectionsAsync(query, cancellationToken);
        return HandleSuccess(result, "Inspections retrieved successfully.");
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "ServiceProvider,Manager,Admin")]
    [ProducesResponseType(typeof(ApiResponse<InspectionResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateInspection(Guid id, [FromBody] UpdateInspectionRequestDto request, CancellationToken cancellationToken)
    {
        var result = await _inspectionService.UpdateInspectionAsync(id, request, cancellationToken);
        return HandleSuccess(result, "Inspection updated successfully.");
    }

    [HttpPatch("{id:guid}/status")]
    [Authorize(Roles = "ServiceProvider,Manager,Admin")]
    [ProducesResponseType(typeof(ApiResponse<InspectionResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateInspectionStatus(Guid id, [FromBody] UpdateInspectionStatusRequestDto request, CancellationToken cancellationToken)
    {
        var result = await _inspectionService.UpdateInspectionStatusAsync(id, request, cancellationToken);
        return HandleSuccess(result, "Inspection status updated successfully.");
    }

    #endregion

    #region Findings

    [HttpGet("{inspectionId:guid}/findings")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<InspectionFindingResponseDto>>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetFindings(Guid inspectionId, CancellationToken cancellationToken)
    {
        var result = await _findingService.GetFindingsByInspectionIdAsync(inspectionId, cancellationToken);
        return HandleSuccess(result, "Inspection findings retrieved successfully.");
    }

    [HttpPost("{inspectionId:guid}/findings")]
    [Authorize(Roles = "ServiceProvider,Manager,Admin")]
    [ProducesResponseType(typeof(ApiResponse<InspectionFindingResponseDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AddFinding(Guid inspectionId, [FromBody] CreateInspectionFindingRequestDto request, CancellationToken cancellationToken)
    {
        var result = await _findingService.AddFindingAsync(inspectionId, request, cancellationToken);
        return HandleCreated($"/api/inspections/{inspectionId}/findings/{result.Id}", result, "Inspection finding recorded successfully.");
    }

    [HttpPut("{inspectionId:guid}/findings/{findingId:guid}")]
    [Authorize(Roles = "ServiceProvider,Manager,Admin")]
    [ProducesResponseType(typeof(ApiResponse<InspectionFindingResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateFinding(Guid inspectionId, Guid findingId, [FromBody] UpdateInspectionFindingRequestDto request, CancellationToken cancellationToken)
    {
        var result = await _findingService.UpdateFindingAsync(inspectionId, findingId, request, cancellationToken);
        return HandleSuccess(result, "Inspection finding updated successfully.");
    }

    [HttpDelete("{inspectionId:guid}/findings/{findingId:guid}")]
    [Authorize(Roles = "ServiceProvider,Manager,Admin")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RemoveFinding(Guid inspectionId, Guid findingId, CancellationToken cancellationToken)
    {
        var result = await _findingService.RemoveFindingAsync(inspectionId, findingId, cancellationToken);
        return HandleSuccess(result, "Inspection finding removed successfully.");
    }

    #endregion
}
