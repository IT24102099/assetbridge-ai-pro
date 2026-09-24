using AssetBridge.Application.Common.Models;
using AssetBridge.Application.DTOs.Providers;
using AssetBridge.Application.DTOs.Representatives;
using AssetBridge.Application.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AssetBridge.Api.Controllers;

// Endpoints for service provider management, trade skill catalogs, scheduling availability, and deterministic matching.
[Authorize]
public class ProvidersController : BaseApiController
{
    private readonly IServiceProviderService _providerService;
    private readonly IProviderSkillService _skillService;
    private readonly IProviderAvailabilityService _availabilityService;
    private readonly IProviderHistoryService _historyService;
    private readonly IProviderMatchingService _matchingService;

    public ProvidersController(
        IServiceProviderService providerService,
        IProviderSkillService skillService,
        IProviderAvailabilityService availabilityService,
        IProviderHistoryService historyService,
        IProviderMatchingService matchingService)
    {
        _providerService = providerService;
        _skillService = skillService;
        _availabilityService = availabilityService;
        _historyService = historyService;
        _matchingService = matchingService;
    }

    #region Provider Profile

    [HttpPost]
    [Authorize(Roles = "ServiceProvider,Manager,Admin")]
    [ProducesResponseType(typeof(ApiResponse<ServiceProviderResponseDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> CreateProvider([FromBody] CreateServiceProviderRequestDto request, CancellationToken cancellationToken)
    {
        var result = await _providerService.CreateServiceProviderAsync(request, cancellationToken);
        return HandleCreated($"/api/providers/{result.Id}", result, "Service provider profile registered successfully.");
    }

    [HttpGet("me")]
    [Authorize(Roles = "ServiceProvider,Manager,Admin")]
    [ProducesResponseType(typeof(ApiResponse<ServiceProviderResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetCurrentProfile(CancellationToken cancellationToken)
    {
        var result = await _providerService.GetCurrentProviderProfileAsync(cancellationToken);
        if (result == null)
        {
            return NotFound(new ApiResponse<object>
            {
                Success = false,
                Message = "Service provider profile not found for authenticated user."
            });
        }

        return HandleSuccess(result, "Service provider profile retrieved successfully.");
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<ServiceProviderResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetProviderById(Guid id, CancellationToken cancellationToken)
    {
        var result = await _providerService.GetServiceProviderByIdAsync(id, cancellationToken);
        return HandleSuccess(result, "Service provider retrieved successfully.");
    }

    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<PagedResponse<ServiceProviderResponseDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetProviders([FromQuery] ProviderQueryParametersDto query, CancellationToken cancellationToken)
    {
        var result = await _providerService.GetServiceProvidersAsync(query, cancellationToken);
        return HandleSuccess(result, "Service providers retrieved successfully.");
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "ServiceProvider,Manager,Admin")]
    [ProducesResponseType(typeof(ApiResponse<ServiceProviderResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateProvider(Guid id, [FromBody] UpdateServiceProviderRequestDto request, CancellationToken cancellationToken)
    {
        var result = await _providerService.UpdateServiceProviderAsync(id, request, cancellationToken);
        return HandleSuccess(result, "Service provider profile updated successfully.");
    }

    [HttpPatch("{id:guid}/verification")]
    [Authorize(Roles = "Manager,Admin")]
    [ProducesResponseType(typeof(ApiResponse<ServiceProviderResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateVerificationStatus(Guid id, [FromBody] UpdateVerificationRequestDto request, CancellationToken cancellationToken)
    {
        var result = await _providerService.UpdateVerificationStatusAsync(id, request, cancellationToken);
        return HandleSuccess(result, "Service provider verification status updated successfully.");
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "ServiceProvider,Manager,Admin")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteProvider(Guid id, CancellationToken cancellationToken)
    {
        var result = await _providerService.DeleteServiceProviderAsync(id, cancellationToken);
        return HandleSuccess(result, "Service provider profile deleted successfully.");
    }

    #endregion

    #region Skills

    [HttpGet("{providerId:guid}/skills")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<ProviderSkillResponseDto>>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetSkills(Guid providerId, CancellationToken cancellationToken)
    {
        var result = await _skillService.GetSkillsByProviderIdAsync(providerId, cancellationToken);
        return HandleSuccess(result, "Provider skills retrieved successfully.");
    }

    [HttpPost("{providerId:guid}/skills")]
    [Authorize(Roles = "ServiceProvider,Manager,Admin")]
    [ProducesResponseType(typeof(ApiResponse<ProviderSkillResponseDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AddSkill(Guid providerId, [FromBody] AddProviderSkillRequestDto request, CancellationToken cancellationToken)
    {
        var result = await _skillService.AddSkillAsync(providerId, request, cancellationToken);
        return HandleCreated($"/api/providers/{providerId}/skills/{result.Id}", result, "Provider skill registered successfully.");
    }

    [HttpDelete("{providerId:guid}/skills/{skillId:guid}")]
    [Authorize(Roles = "ServiceProvider,Manager,Admin")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RemoveSkill(Guid providerId, Guid skillId, CancellationToken cancellationToken)
    {
        var result = await _skillService.RemoveSkillAsync(providerId, skillId, cancellationToken);
        return HandleSuccess(result, "Provider skill removed successfully.");
    }

    #endregion

    #region Availability

    [HttpGet("{providerId:guid}/availability")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<ProviderAvailabilityResponseDto>>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetAvailability(
        Guid providerId,
        [FromQuery] DateTime? startDateUtc,
        [FromQuery] DateTime? endDateUtc,
        CancellationToken cancellationToken)
    {
        var result = await _availabilityService.GetAvailabilityByProviderIdAsync(providerId, startDateUtc, endDateUtc, cancellationToken);
        return HandleSuccess(result, "Provider availability slots retrieved successfully.");
    }

    [HttpPost("{providerId:guid}/availability")]
    [Authorize(Roles = "ServiceProvider,Manager,Admin")]
    [ProducesResponseType(typeof(ApiResponse<ProviderAvailabilityResponseDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AddAvailability(Guid providerId, [FromBody] AddProviderAvailabilityRequestDto request, CancellationToken cancellationToken)
    {
        var result = await _availabilityService.AddAvailabilityAsync(providerId, request, cancellationToken);
        return HandleCreated($"/api/providers/{providerId}/availability/{result.Id}", result, "Availability slot created successfully.");
    }

    [HttpPut("{providerId:guid}/availability/{availabilityId:guid}")]
    [Authorize(Roles = "ServiceProvider,Manager,Admin")]
    [ProducesResponseType(typeof(ApiResponse<ProviderAvailabilityResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateAvailability(
        Guid providerId,
        Guid availabilityId,
        [FromBody] UpdateProviderAvailabilityRequestDto request,
        CancellationToken cancellationToken)
    {
        var result = await _availabilityService.UpdateAvailabilityAsync(providerId, availabilityId, request, cancellationToken);
        return HandleSuccess(result, "Availability slot updated successfully.");
    }

    [HttpDelete("{providerId:guid}/availability/{availabilityId:guid}")]
    [Authorize(Roles = "ServiceProvider,Manager,Admin")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteAvailability(Guid providerId, Guid availabilityId, CancellationToken cancellationToken)
    {
        var result = await _availabilityService.DeleteAvailabilityAsync(providerId, availabilityId, cancellationToken);
        return HandleSuccess(result, "Availability slot removed successfully.");
    }

    #endregion

    #region History

    [HttpGet("{providerId:guid}/history")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<ProviderHistoryResponseDto>>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetHistory(Guid providerId, CancellationToken cancellationToken)
    {
        var result = await _historyService.GetHistoryByProviderIdAsync(providerId, cancellationToken);
        return HandleSuccess(result, "Provider history retrieved successfully.");
    }

    [HttpPost("{providerId:guid}/history")]
    [Authorize(Roles = "Manager,Admin")]
    [ProducesResponseType(typeof(ApiResponse<ProviderHistoryResponseDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AddHistoryEntry(Guid providerId, [FromBody] AddProviderHistoryRequestDto request, CancellationToken cancellationToken)
    {
        var result = await _historyService.AddHistoryEntryAsync(providerId, request, cancellationToken);
        return HandleCreated($"/api/providers/{providerId}/history/{result.Id}", result, "Provider history entry recorded successfully.");
    }

    #endregion

    #region Matching

    [HttpPost("match")]
    [Authorize(Roles = "Owner,Representative,Manager,Admin")]
    [ProducesResponseType(typeof(ApiResponse<ProviderMatchingResultDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> MatchProviders([FromBody] ProviderMatchingRequestDto request, CancellationToken cancellationToken)
    {
        var result = await _matchingService.MatchProvidersAsync(request, cancellationToken);
        return HandleSuccess(result, "Matching service providers retrieved successfully.");
    }

    #endregion
}
