using AssetBridge.Application.DTOs.Providers;

namespace AssetBridge.Application.Services.Interfaces;

// Evaluates candidate service providers against incident requirements using deterministic scoring and explainable criteria.
public interface IProviderMatchingService
{
    Task<ProviderMatchingResultDto> MatchProvidersAsync(ProviderMatchingRequestDto request, CancellationToken cancellationToken = default);
}
