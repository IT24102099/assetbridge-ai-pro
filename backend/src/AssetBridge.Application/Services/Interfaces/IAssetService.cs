using AssetBridge.Application.Common.Models;
using AssetBridge.Application.DTOs.Assets;

namespace AssetBridge.Application.Services.Interfaces;

// Orchestrates property asset lifecycle operations while enforcing owner isolation and security policies.
public interface IAssetService
{
    Task<AssetResponseDto> CreateAssetAsync(CreateAssetRequestDto request, CancellationToken cancellationToken = default);
    Task<AssetResponseDto> GetAssetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<PagedResponse<AssetResponseDto>> GetAssetsAsync(AssetQueryParametersDto query, CancellationToken cancellationToken = default);
    Task<AssetResponseDto> UpdateAssetAsync(Guid id, UpdateAssetRequestDto request, CancellationToken cancellationToken = default);
    Task<bool> DeleteAssetAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AssetHistoryResponseDto>> GetAssetHistoryAsync(Guid assetId, CancellationToken cancellationToken = default);
    Task<AssetMediaResponseDto> AddMediaAsync(Guid assetId, AddAssetMediaRequestDto request, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AssetMediaResponseDto>> GetMediaAsync(Guid assetId, CancellationToken cancellationToken = default);
    Task<bool> DeleteMediaAsync(Guid assetId, Guid mediaId, CancellationToken cancellationToken = default);
    Task<AssetMediaResponseDto> SetThumbnailAsync(Guid assetId, Guid mediaId, CancellationToken cancellationToken = default);
}
