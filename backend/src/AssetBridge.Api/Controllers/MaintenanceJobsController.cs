using AssetBridge.Application.Common.Models;
using AssetBridge.Application.DTOs.Maintenance;
using AssetBridge.Application.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AssetBridge.Api.Controllers;

[Authorize]
[Route("api/maintenance-jobs")]
public class MaintenanceJobsController : BaseApiController
{
    private readonly IMaintenanceJobService _jobService;

    public MaintenanceJobsController(IMaintenanceJobService jobService)
    {
        _jobService = jobService;
    }

    [HttpPost]
    [Authorize(Roles = "Manager,Admin,ServiceProvider")]
    [ProducesResponseType(typeof(ApiResponse<MaintenanceJobResponseDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> CreateJob([FromBody] CreateMaintenanceJobRequestDto request, CancellationToken cancellationToken)
    {
        var result = await _jobService.CreateJobAsync(request, cancellationToken);
        return HandleCreated($"/api/maintenance-jobs/{result.Id}", result, "Maintenance job created successfully.");
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<MaintenanceJobResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetJobById(Guid id, CancellationToken cancellationToken)
    {
        var result = await _jobService.GetJobByIdAsync(id, cancellationToken);
        return HandleSuccess(result, "Maintenance job retrieved successfully.");
    }

    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<PagedResponse<MaintenanceJobResponseDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetJobs([FromQuery] MaintenanceJobQueryParametersDto query, CancellationToken cancellationToken)
    {
        var result = await _jobService.GetJobsAsync(query, cancellationToken);
        return HandleSuccess(result, "Maintenance jobs retrieved successfully.");
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Manager,Admin,ServiceProvider")]
    [ProducesResponseType(typeof(ApiResponse<MaintenanceJobResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateJob(Guid id, [FromBody] UpdateMaintenanceJobRequestDto request, CancellationToken cancellationToken)
    {
        var result = await _jobService.UpdateJobAsync(id, request, cancellationToken);
        return HandleSuccess(result, "Maintenance job updated successfully.");
    }

    [HttpPatch("{id:guid}/status")]
    [Authorize(Roles = "Manager,Admin,ServiceProvider")]
    [ProducesResponseType(typeof(ApiResponse<MaintenanceJobResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateJobStatus(Guid id, [FromBody] UpdateMaintenanceJobStatusRequestDto request, CancellationToken cancellationToken)
    {
        var result = await _jobService.UpdateJobStatusAsync(id, request, cancellationToken);
        return HandleSuccess(result, "Maintenance job status updated successfully.");
    }
}
