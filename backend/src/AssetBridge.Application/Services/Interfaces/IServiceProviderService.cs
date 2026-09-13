using AssetBridge.Application.Common.Models;
using AssetBridge.Application.DTOs.Providers;
using AssetBridge.Application.DTOs.Representatives;

namespace AssetBridge.Application.Services.Interfaces;

// Service interface managing verified service providers/contractors.
public interface IServiceProviderService
{
    Task<ServiceProviderResponseDto> CreateServiceProviderAsync(CreateServiceProviderRequestDto request, CancellationToken cancellationToken = default);
    Task<ServiceProviderResponseDto> GetServiceProviderByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<ServiceProviderResponseDto?> GetCurrentProviderProfileAsync(CancellationToken cancellationToken = default);
    Task<PagedResponse<ServiceProviderResponseDto>> GetServiceProvidersAsync(ProviderQueryParametersDto query, CancellationToken cancellationToken = default);
    Task<ServiceProviderResponseDto> UpdateServiceProviderAsync(Guid id, UpdateServiceProviderRequestDto request, CancellationToken cancellationToken = default);
    Task<ServiceProviderResponseDto> UpdateVerificationStatusAsync(Guid id, UpdateVerificationRequestDto request, CancellationToken cancellationToken = default);
    Task<bool> DeleteServiceProviderAsync(Guid id, CancellationToken cancellationToken = default);
}
