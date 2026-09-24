using AssetBridge.Application.Common.Models;
using AssetBridge.Application.DTOs.Assets;
using AssetBridge.Application.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AssetBridge.Api.Controllers;

// Provides REST endpoints for real estate property asset lifecycle management.
// Enforces server-side ownership isolation so overseas owners cannot view or mutate another owner's properties.
[Authorize]
public class AssetsController : BaseApiController
{
    private readonly IAssetService _assetService;

    public AssetsController(IAssetService assetService)
    {
        _assetService = assetService;
    }

    [HttpPost]
    [Authorize(Roles = "Owner,Manager,Admin")]
    [ProducesResponseType(typeof(ApiResponse<AssetResponseDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> CreateAsset([FromBody] CreateAssetRequestDto request, CancellationToken cancellationToken)
    {
        var result = await _assetService.CreateAssetAsync(request, cancellationToken);
        return HandleCreated($"/api/assets/{result.Id}", result, "Property asset registered successfully.");
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<AssetResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetAssetById(Guid id, CancellationToken cancellationToken)
    {
        var result = await _assetService.GetAssetByIdAsync(id, cancellationToken);
        return HandleSuccess(result, "Property asset retrieved successfully.");
    }

    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<PagedResponse<AssetResponseDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAssets([FromQuery] AssetQueryParametersDto query, CancellationToken cancellationToken)
    {
        var result = await _assetService.GetAssetsAsync(query, cancellationToken);
        return HandleSuccess(result, "Property assets retrieved successfully.");
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Owner,Manager,Admin")]
    [ProducesResponseType(typeof(ApiResponse<AssetResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateAsset(Guid id, [FromBody] UpdateAssetRequestDto request, CancellationToken cancellationToken)
    {
        var result = await _assetService.UpdateAssetAsync(id, request, cancellationToken);
        return HandleSuccess(result, "Property asset updated successfully.");
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Owner,Manager,Admin")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteAsset(Guid id, CancellationToken cancellationToken)
    {
        var result = await _assetService.DeleteAssetAsync(id, cancellationToken);
        return HandleSuccess(result, "Property asset archived successfully.");
    }

    [HttpGet("{id:guid}/history")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<AssetHistoryResponseDto>>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetAssetHistory(Guid id, CancellationToken cancellationToken)
    {
        var result = await _assetService.GetAssetHistoryAsync(id, cancellationToken);
        return HandleSuccess(result, "Property continuity history timeline retrieved.");
    }

    [HttpPost("{id:guid}/media")]
    [Authorize(Roles = "Owner,Manager,Admin")]
    [ProducesResponseType(typeof(ApiResponse<AssetMediaResponseDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AddMedia(Guid id, [FromBody] AddAssetMediaRequestDto request, CancellationToken cancellationToken)
    {
        var result = await _assetService.AddMediaAsync(id, request, cancellationToken);
        return HandleCreated($"/api/assets/{id}/media/{result.Id}", result, "Property media uploaded successfully.");
    }

    [HttpGet("{id:guid}/media")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<AssetMediaResponseDto>>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetMedia(Guid id, CancellationToken cancellationToken)
    {
        var result = await _assetService.GetMediaAsync(id, cancellationToken);
        return HandleSuccess(result, "Property media gallery retrieved.");
    }

    [HttpDelete("{id:guid}/media/{mediaId:guid}")]
    [Authorize(Roles = "Owner,Manager,Admin")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteMedia(Guid id, Guid mediaId, CancellationToken cancellationToken)
    {
        var result = await _assetService.DeleteMediaAsync(id, mediaId, cancellationToken);
        return HandleSuccess(result, "Property media deleted successfully.");
    }

    [HttpPatch("{id:guid}/media/{mediaId:guid}/thumbnail")]
    [Authorize(Roles = "Owner,Manager,Admin")]
    [ProducesResponseType(typeof(ApiResponse<AssetMediaResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SetThumbnail(Guid id, Guid mediaId, CancellationToken cancellationToken)
    {
        var result = await _assetService.SetThumbnailAsync(id, mediaId, cancellationToken);
        return HandleSuccess(result, "Property thumbnail cover image updated successfully.");
    }
}
