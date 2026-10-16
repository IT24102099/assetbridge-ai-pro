
using AssetBridge.Application.Common.Models;
using AssetBridge.Application.DTOs.Representatives;
using AssetBridge.Application.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AssetBridge.Api.Controllers;

// Endpoints for local representative management, directory search, and verification approval.
[Authorize]
public class RepresentativesController : BaseApiController
{
    private readonly IRepresentativeService _representativeService;

    public RepresentativesController(IRepresentativeService representativeService)
    {
        _representativeService = representativeService;
    }

    [HttpPost]
    [Authorize(Roles = "Representative,Manager,Admin")]
    [ProducesResponseType(typeof(ApiResponse<RepresentativeResponseDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> CreateRepresentative(
        [FromBody] CreateRepresentativeRequestDto request,
        CancellationToken cancellationToken)
    {
        var result = await _representativeService.CreateRepresentativeAsync(
            request, cancellationToken);

        return HandleCreated(
            $"/api/representatives/{result.Id}",
            result,
            "Representative profile registered successfully.");
    }

    [HttpGet("me")]
    [Authorize(Roles = "Representative,Manager,Admin")]
    [ProducesResponseType(typeof(ApiResponse<RepresentativeResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetCurrentProfile(
        CancellationToken cancellationToken)
    {
        var result = await _representativeService
            .GetCurrentRepresentativeProfileAsync(cancellationToken);

        if (result == null)
        {
            return NotFound(new ApiResponse<object>
            {
                Success = false,
                Message = "Representative profile not found for authenticated user."
            });
        }

        return HandleSuccess(
            result,
            "Representative profile retrieved successfully.");
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<RepresentativeResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetRepresentativeById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var result = await _representativeService.GetRepresentativeByIdAsync(
            id, cancellationToken);

        return HandleSuccess(result, "Representative retrieved successfully.");
    }

    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<PagedResponse<RepresentativeResponseDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetRepresentatives(
        [FromQuery] RepresentativeQueryParametersDto query,
        CancellationToken cancellationToken)
    {
        var result = await _representativeService.GetRepresentativesAsync(
            query, cancellationToken);

        return HandleSuccess(result, "Representatives retrieved successfully.");
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Representative,Manager,Admin")]
    [ProducesResponseType(typeof(ApiResponse<RepresentativeResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateRepresentative(
        Guid id,
        [FromBody] UpdateRepresentativeRequestDto request,
        CancellationToken cancellationToken)
    {
        var result = await _representativeService.UpdateRepresentativeAsync(
            id, request, cancellationToken);

        return HandleSuccess(result, "Representative profile updated successfully.");
    }

    [HttpPatch("{id:guid}/verification")]
    [Authorize(Roles = "Manager,Admin")]
    [ProducesResponseType(typeof(ApiResponse<RepresentativeResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateVerificationStatus(
        Guid id,
        [FromBody] UpdateVerificationRequestDto request,
        CancellationToken cancellationToken)
    {
        var result = await _representativeService.UpdateVerificationStatusAsync(
            id, request, cancellationToken);

        return HandleSuccess(
            result,
            "Representative verification status updated successfully.");
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Representative,Manager,Admin")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteRepresentative(
        Guid id,
        CancellationToken cancellationToken)
    {
        var result = await _representativeService.DeleteRepresentativeAsync(
            id, cancellationToken);

        return HandleSuccess(result, "Representative profile deleted successfully.");
    }

    // Upload a verification document using multipart/form-data.
    [HttpPost("{id:guid}/documents")]
    [Authorize(Roles = "Representative,Manager,Admin")]
    [Consumes("multipart/form-data")]
    [ProducesResponseType(typeof(ApiResponse<RepresentativeDocumentResponseDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UploadVerificationDocument(
        Guid id,
        IFormFile file,
        [FromForm] string documentType,
        CancellationToken cancellationToken)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new ApiResponse<object>
            {
                Success = false,
                Message = "No document file was provided for upload."
            });
        }

        await using var stream = file.OpenReadStream();

        var result = await _representativeService.UploadVerificationDocumentAsync(
            id,
            stream,
            file.FileName,
            file.ContentType,
            file.Length,
            documentType,
            cancellationToken);

        return HandleCreated(
            $"/api/representatives/{id}/documents/{result.Id}",
            result,
            "Verification document uploaded successfully.");
    }

    [HttpGet("{id:guid}/documents")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<RepresentativeDocumentResponseDto>>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetVerificationDocuments(
        Guid id,
        CancellationToken cancellationToken)
    {
        var result = await _representativeService.GetVerificationDocumentsAsync(
            id, cancellationToken);

        return HandleSuccess(
            result,
            "Verification documents retrieved successfully.");
    }

    [HttpPatch("{id:guid}/documents/{documentId:guid}/review")]
    [Authorize(Roles = "Manager,Admin")]
    [ProducesResponseType(typeof(ApiResponse<RepresentativeDocumentResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ReviewVerificationDocument(
        Guid id,
        Guid documentId,
        [FromBody] ReviewRepresentativeDocumentRequestDto request,
        CancellationToken cancellationToken)
    {
        var result = await _representativeService.ReviewVerificationDocumentAsync(
            id, documentId, request, cancellationToken);

        return HandleSuccess(
            result,
            "Document verification status updated successfully.");
    }
}
