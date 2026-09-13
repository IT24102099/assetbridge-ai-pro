using AssetBridge.Application.DTOs.Providers;

namespace AssetBridge.Application.Services.Interfaces;

// Service interface managing availability schedules and booking slots for service providers.
public interface IProviderAvailabilityService
{
    Task<IReadOnlyList<ProviderAvailabilityResponseDto>> GetAvailabilityByProviderIdAsync(Guid providerId, DateTime? startDateUtc = null, DateTime? endDateUtc = null, CancellationToken cancellationToken = default);
    Task<ProviderAvailabilityResponseDto> AddAvailabilityAsync(Guid providerId, AddProviderAvailabilityRequestDto request, CancellationToken cancellationToken = default);
    Task<ProviderAvailabilityResponseDto> UpdateAvailabilityAsync(Guid providerId, Guid availabilityId, UpdateProviderAvailabilityRequestDto request, CancellationToken cancellationToken = default);
    Task<bool> DeleteAvailabilityAsync(Guid providerId, Guid availabilityId, CancellationToken cancellationToken = default);
}
