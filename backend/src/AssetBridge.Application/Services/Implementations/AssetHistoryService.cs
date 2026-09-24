using AssetBridge.Application.Common.Interfaces;
using AssetBridge.Application.DTOs.Assets;
using AssetBridge.Application.Services.Interfaces;
using AssetBridge.Domain.Entities.Assets;
using AssetBridge.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AssetBridge.Application.Services.Implementations;

// Implements the Property Continuity Timeline recorder.
// Preserves historical business milestones across the lifecycle of a real estate asset.
public class AssetHistoryService : IAssetHistoryService
{
    private readonly IApplicationDbContext _context;
    private readonly ILogger<AssetHistoryService> _logger;

    public AssetHistoryService(IApplicationDbContext context, ILogger<AssetHistoryService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task RecordEventAsync(
        Guid assetId,
        AssetHistoryEventType eventType,
        string title,
        string description,
        Guid? performedByUserId = null,
        Guid? relatedIncidentId = null,
        CancellationToken cancellationToken = default)
    {
        var historyEntry = new AssetHistory
        {
            Id = Guid.NewGuid(),
            AssetId = assetId,
            PerformedByUserId = performedByUserId,
            EventType = eventType,
            EventTitle = title,
            EventDescription = description,
            RelatedIncidentId = relatedIncidentId,
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.AssetHistory.Add(historyEntry);
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Asset history event recorded: {EventType} for Asset {AssetId}", eventType, assetId);
    }

    public async Task<IReadOnlyList<AssetHistoryResponseDto>> GetHistoryByAssetIdAsync(
        Guid assetId,
        CancellationToken cancellationToken = default)
    {
        return await _context.AssetHistory
            .AsNoTracking()
            .Where(h => h.AssetId == assetId)
            .Include(h => h.PerformedByUser)
            .OrderByDescending(h => h.CreatedAtUtc)
            .Select(h => new AssetHistoryResponseDto
            {
                Id = h.Id,
                AssetId = h.AssetId,
                PerformedByUserId = h.PerformedByUserId,
                PerformedByUserName = h.PerformedByUser != null ? h.PerformedByUser.FullName : "System",
                EventType = h.EventType,
                EventTitle = h.EventTitle,
                EventDescription = h.EventDescription,
                RelatedIncidentId = h.RelatedIncidentId,
                CreatedAtUtc = h.CreatedAtUtc
            })
            .ToListAsync(cancellationToken);
    }
}
