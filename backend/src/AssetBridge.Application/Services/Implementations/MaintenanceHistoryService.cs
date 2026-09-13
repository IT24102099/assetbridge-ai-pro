using AssetBridge.Application.Common.Interfaces;
using AssetBridge.Application.DTOs.Maintenance;
using AssetBridge.Application.Services.Interfaces;
using AssetBridge.Domain.Entities.Assets;
using AssetBridge.Domain.Entities.Maintenance;
using AssetBridge.Domain.Entities.Users;
using AssetBridge.Domain.Enums;
using AssetBridge.Domain.Exceptions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AssetBridge.Application.Services.Implementations;

public class MaintenanceHistoryService : IMaintenanceHistoryService
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly ILogger<MaintenanceHistoryService> _logger;

    public MaintenanceHistoryService(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        ILogger<MaintenanceHistoryService> logger)
    {
        _context = context;
        _currentUserService = currentUserService;
        _logger = logger;
    }

    public async Task<IReadOnlyList<MaintenanceHistoryResponseDto>> GetHistoryByAssetIdAsync(Guid assetId, CancellationToken cancellationToken = default)
    {
        var asset = await _context.Assets
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == assetId, cancellationToken);

        if (asset == null)
        {
            throw new EntityNotFoundException(nameof(Asset), assetId);
        }

        if (_currentUserService.Role == UserRole.Owner)
        {
            var currentUserId = GetAuthenticatedUserId();
            if (asset.OwnerId != currentUserId)
            {
                throw new UnauthorizedAccessException("You do not have permission to view maintenance history for this asset.");
            }
        }

        var history = await _context.MaintenanceHistory
            .AsNoTracking()
            .Where(h => h.AssetId == assetId)
            .OrderByDescending(h => h.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        return history.Select(MapToDto).ToList();
    }

    public async Task<MaintenanceHistoryResponseDto> RecordHistoryAsync(RecordMaintenanceHistoryRequestDto request, CancellationToken cancellationToken = default)
    {
        var assetExists = await _context.Assets.AnyAsync(a => a.Id == request.AssetId, cancellationToken);
        if (!assetExists)
        {
            throw new EntityNotFoundException(nameof(Asset), request.AssetId);
        }

        var currentUserId = GetAuthenticatedUserId();

        var entry = new MaintenanceHistory
        {
            Id = Guid.NewGuid(),
            AssetId = request.AssetId,
            IncidentId = request.IncidentId,
            MaintenanceJobId = request.MaintenanceJobId,
            EventType = request.EventType,
            Title = request.Title.Trim(),
            Description = request.Description.Trim(),
            RecordedCost = request.RecordedCost,
            RecordedByUserId = currentUserId,
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.MaintenanceHistory.Add(entry);
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("MaintenanceHistory entry {HistoryId} recorded for Asset {AssetId}", entry.Id, request.AssetId);

        return MapToDto(entry);
    }

    private Guid GetAuthenticatedUserId()
    {
        if (!_currentUserService.IsAuthenticated || !_currentUserService.UserId.HasValue)
        {
            throw new UnauthorizedAccessException("User is not authenticated.");
        }

        return _currentUserService.UserId.Value;
    }

    private static MaintenanceHistoryResponseDto MapToDto(MaintenanceHistory h) => new()
    {
        Id = h.Id,
        AssetId = h.AssetId,
        IncidentId = h.IncidentId,
        MaintenanceJobId = h.MaintenanceJobId,
        EventType = h.EventType,
        Title = h.Title,
        Description = h.Description,
        RecordedCost = h.RecordedCost,
        RecordedByUserId = h.RecordedByUserId,
        CreatedAtUtc = h.CreatedAtUtc
    };
}
