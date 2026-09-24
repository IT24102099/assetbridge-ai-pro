using AssetBridge.Application.DTOs.Assets;
using AssetBridge.Domain.Enums;

namespace AssetBridge.Application.Services.Interfaces;

// Manages recording and retrieval of business lifecycle events in the Property Continuity Timeline.
public interface IAssetHistoryService
{
    Task RecordEventAsync(
        Guid assetId,
        AssetHistoryEventType eventType,
        string title,
        string description,
        Guid? performedByUserId = null,
        Guid? relatedIncidentId = null,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AssetHistoryResponseDto>> GetHistoryByAssetIdAsync(
        Guid assetId,
        CancellationToken cancellationToken = default);
}
