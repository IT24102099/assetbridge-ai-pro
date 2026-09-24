using AssetBridge.Application.Common.Interfaces;
using AssetBridge.Application.DTOs.Providers;
using AssetBridge.Application.Services.Interfaces;
using AssetBridge.Domain.Entities.Providers;
using AssetBridge.Domain.Entities.Users;
using AssetBridge.Domain.Enums;
using AssetBridge.Domain.Exceptions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AssetBridge.Application.Services.Implementations;

// Implements performance tracking, job history, and rating aggregations for contractors.
public class ProviderHistoryService : IProviderHistoryService
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly ILogger<ProviderHistoryService> _logger;

    public ProviderHistoryService(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        ILogger<ProviderHistoryService> logger)
    {
        _context = context;
        _currentUserService = currentUserService;
        _logger = logger;
    }

    public async Task<IReadOnlyList<ProviderHistoryResponseDto>> GetHistoryByProviderIdAsync(Guid providerId, CancellationToken cancellationToken = default)
    {
        var providerExists = await _context.ServiceProviders.AnyAsync(p => p.Id == providerId, cancellationToken);
        if (!providerExists)
        {
            throw new EntityNotFoundException(nameof(ServiceProvider), providerId);
        }

        var history = await _context.ProviderHistory
            .AsNoTracking()
            .Where(h => h.ProviderId == providerId)
            .OrderByDescending(h => h.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        return history.Select(MapToDto).ToList();
    }

    public async Task<ProviderHistoryResponseDto> AddHistoryEntryAsync(Guid providerId, AddProviderHistoryRequestDto request, CancellationToken cancellationToken = default)
    {
        var provider = await _context.ServiceProviders
            .Include(p => p.HistoryEntries)
            .FirstOrDefaultAsync(p => p.Id == providerId, cancellationToken);

        if (provider == null)
        {
            throw new EntityNotFoundException(nameof(ServiceProvider), providerId);
        }

        // Only Managers, Admins, or system workflow automation can log verified historical performance
        if (_currentUserService.Role != UserRole.Admin && _currentUserService.Role != UserRole.Manager)
        {
            throw new UnauthorizedAccessException("Only Managers and Administrators can record official performance history.");
        }

        var historyEntry = new ProviderHistory
        {
            Id = Guid.NewGuid(),
            ProviderId = providerId,
            EventType = request.EventType,
            Title = request.Title.Trim(),
            Description = request.Description.Trim(),
            RatingScore = request.RatingScore,
            RelatedIncidentId = request.RelatedIncidentId,
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.ProviderHistory.Add(historyEntry);

        // Update provider aggregated metrics
        if (request.EventType == ProviderHistoryType.JobCompleted)
        {
            provider.CompletedJobsCount += 1;
        }

        if (request.RatingScore.HasValue)
        {
            // Recalculate average rating across all rated history events
            var existingRatedScores = provider.HistoryEntries
                .Where(h => h.RatingScore.HasValue)
                .Select(h => h.RatingScore!.Value)
                .ToList();

            existingRatedScores.Add(request.RatingScore.Value);
            provider.Rating = Math.Round(existingRatedScores.Average(), 1);
        }

        provider.UpdatedAtUtc = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("History entry {HistoryId} ({EventType}) logged for Provider {ProviderId}",
            historyEntry.Id, historyEntry.EventType, providerId);

        return MapToDto(historyEntry);
    }

    private static ProviderHistoryResponseDto MapToDto(ProviderHistory h) => new()
    {
        Id = h.Id,
        ProviderId = h.ProviderId,
        EventType = h.EventType,
        Title = h.Title,
        Description = h.Description,
        RatingScore = h.RatingScore,
        RelatedIncidentId = h.RelatedIncidentId,
        CreatedAtUtc = h.CreatedAtUtc
    };
}
