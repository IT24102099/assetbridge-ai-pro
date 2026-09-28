using AssetBridge.Application.Common.Models;
using AssetBridge.Application.DTOs.Incidents;
using AssetBridge.Application.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AssetBridge.Api.Controllers;

// Provides REST endpoints for maintenance problem reporting, lifecycle transitions, and evidence attachments.
[Authorize]
public class IncidentsController : BaseApiController
{
    private readonly IIncidentService _incidentService;

    public IncidentsController(IIncidentService incidentService)
    {
        _incidentService = incidentService;
    }

    [HttpPost]
    [Authorize(Roles = "Owner,Representative,Manager,Admin")]
    [ProducesResponseType(typeof(ApiResponse<IncidentResponseDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CreateIncident([FromBody] CreateIncidentRequestDto request, CancellationToken cancellationToken)
    {
        var result = await _incidentService.CreateIncidentAsync(request, cancellationToken);
        return HandleCreated($"/api/incidents/{result.Id}", result, "Maintenance incident reported successfully.");
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<IncidentResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetIncidentById(Guid id, CancellationToken cancellationToken)
    {
        var result = await _incidentService.GetIncidentByIdAsync(id, cancellationToken);
        return HandleSuccess(result, "Incident details retrieved successfully.");
    }

    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<PagedResponse<IncidentResponseDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetIncidents([FromQuery] IncidentQueryParametersDto query, CancellationToken cancellationToken)
    {
        var result = await _incidentService.GetIncidentsAsync(query, cancellationToken);
        return HandleSuccess(result, "Incidents list retrieved successfully.");
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Owner,Representative,Manager,Admin")]
    [ProducesResponseType(typeof(ApiResponse<IncidentResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateIncident(Guid id, [FromBody] UpdateIncidentRequestDto request, CancellationToken cancellationToken)
    {
        var result = await _incidentService.UpdateIncidentAsync(id, request, cancellationToken);
        return HandleSuccess(result, "Incident updated successfully.");
    }

    [HttpPatch("{id:guid}/status")]
    [Authorize(Roles = "Owner,Representative,Manager,Admin")]
    [ProducesResponseType(typeof(ApiResponse<IncidentResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> UpdateIncidentStatus(Guid id, [FromBody] UpdateIncidentStatusRequestDto request, CancellationToken cancellationToken)
    {
        var result = await _incidentService.UpdateIncidentStatusAsync(id, request, cancellationToken);
        return HandleSuccess(result, "Incident status updated successfully.");
    }

    [HttpPost("{id:guid}/evidence")]
    [ProducesResponseType(typeof(ApiResponse<IncidentEvidenceResponseDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AddEvidence(Guid id, [FromBody] AddIncidentEvidenceRequestDto request, CancellationToken cancellationToken)
    {
        var result = await _incidentService.AddEvidenceAsync(id, request, cancellationToken);
        return HandleCreated($"/api/incidents/{id}/evidence/{result.Id}", result, "Incident evidence uploaded successfully.");
    }

    [HttpPost("{id:guid}/evidence/upload")]
    [Authorize(Roles = "Owner,Representative,Manager,Admin")]
    [Consumes("multipart/form-data")]
    [ProducesResponseType(typeof(ApiResponse<IncidentEvidenceResponseDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UploadEvidence(
        Guid id,
        IFormFile file,
        [FromForm] AssetBridge.Domain.Enums.EvidenceType evidenceType = AssetBridge.Domain.Enums.EvidenceType.Photo,
        [FromForm] string? caption = null,
        CancellationToken cancellationToken = default)
    {
        if (file == null || file.Length == 0)
        {
            return HandleFailure<IncidentEvidenceResponseDto>("No file was uploaded or file is empty.");
        }

        const long maxSizeBytes = 10 * 1024 * 1024; // 10MB
        if (file.Length > maxSizeBytes)
        {
            return HandleFailure<IncidentEvidenceResponseDto>("File size exceeds the 10MB limit.");
        }

        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp" };
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!allowedExtensions.Contains(ext))
        {
            return HandleFailure<IncidentEvidenceResponseDto>("Unsupported image format. Allowed formats: JPG, PNG, WEBP.");
        }

        var contentType = file.ContentType;
        if (string.IsNullOrEmpty(contentType) || contentType == "application/octet-stream")
        {
            contentType = ext switch
            {
                ".png" => "image/png",
                ".webp" => "image/webp",
                _ => "image/jpeg"
            };
        }

        await using var stream = file.OpenReadStream();
        var result = await _incidentService.UploadEvidenceAsync(
            id,
            stream,
            file.FileName,
            contentType,
            file.Length,
            evidenceType,
            caption,
            cancellationToken);

        return HandleCreated($"/api/incidents/{id}/evidence/{result.Id}", result, "Incident evidence uploaded to persistent storage successfully.");
    }

    [HttpGet("{id:guid}/evidence")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<IncidentEvidenceResponseDto>>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetIncidentEvidence(Guid id, CancellationToken cancellationToken)
    {
        var result = await _incidentService.GetIncidentEvidenceAsync(id, cancellationToken);
        return HandleSuccess(result, "Incident evidence collection retrieved.");
    }

    [HttpDelete("{id:guid}/evidence/{evidenceId:guid}")]
    [Authorize(Roles = "Owner,Manager,Admin")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteEvidence(Guid id, Guid evidenceId, CancellationToken cancellationToken)
    {
        var result = await _incidentService.DeleteEvidenceAsync(id, evidenceId, cancellationToken);
        return HandleSuccess(result, "Incident evidence deleted successfully.");
    }
}
