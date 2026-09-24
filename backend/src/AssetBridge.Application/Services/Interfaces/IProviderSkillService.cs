using AssetBridge.Application.DTOs.Providers;

namespace AssetBridge.Application.Services.Interfaces;

// Service interface managing trade/specialized skills for service providers.
public interface IProviderSkillService
{
    Task<IReadOnlyList<ProviderSkillResponseDto>> GetSkillsByProviderIdAsync(Guid providerId, CancellationToken cancellationToken = default);
    Task<ProviderSkillResponseDto> AddSkillAsync(Guid providerId, AddProviderSkillRequestDto request, CancellationToken cancellationToken = default);
    Task<bool> RemoveSkillAsync(Guid providerId, Guid skillId, CancellationToken cancellationToken = default);
}
