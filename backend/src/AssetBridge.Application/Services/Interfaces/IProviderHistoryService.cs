using AssetBridge.Application.DTOs.Providers;

namespace AssetBridge.Application.Services.Interfaces;

// Service interface managing verified contractor job performance and feedback records.
public interface IProviderHistoryService
{
    Task<IReadOnlyList<ProviderHistoryResponseDto>> GetHistoryByProviderIdAsync(Guid providerId, CancellationToken cancellationToken = default);
    Task<ProviderHistoryResponseDto> AddHistoryEntryAsync(Guid providerId, AddProviderHistoryRequestDto request, CancellationToken cancellationToken = default);
}
