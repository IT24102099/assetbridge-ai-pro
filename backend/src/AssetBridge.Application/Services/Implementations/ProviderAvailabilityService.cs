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

// Implements working schedule management for contractors.
public class ProviderAvailabilityService : IProviderAvailabilityService
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly ILogger<ProviderAvailabilityService> _logger;

    public ProviderAvailabilityService(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        ILogger<ProviderAvailabilityService> logger)
    {
        _context = context;
        _currentUserService = currentUserService;
        _logger = logger;
    }

    public async Task<IReadOnlyList<ProviderAvailabilityResponseDto>> GetAvailabilityByProviderIdAsync(
        Guid providerId,
        DateTime? startDateUtc = null,
        DateTime? endDateUtc = null,
        CancellationToken cancellationToken = default)
    {
        var providerExists = await _context.ServiceProviders.AnyAsync(p => p.Id == providerId, cancellationToken);
        if (!providerExists)
        {
            throw new EntityNotFoundException(nameof(ServiceProvider), providerId);
        }

        var dbQuery = _context.ProviderAvailability
            .AsNoTracking()
            .Where(a => a.ProviderId == providerId);

        if (startDateUtc.HasValue)
        {
            var start = startDateUtc.Value.Date;
            dbQuery = dbQuery.Where(a => a.AvailableDateUtc >= start);
        }

        if (endDateUtc.HasValue)
        {
            var end = endDateUtc.Value.Date.AddDays(1);
            dbQuery = dbQuery.Where(a => a.AvailableDateUtc < end);
        }

        var slots = await dbQuery
            .OrderBy(a => a.AvailableDateUtc)
            .ThenBy(a => a.StartTime)
            .ThenByDescending(a => a.UpdatedAtUtc ?? a.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        return slots.Select(MapToDto).ToList();
    }

    public async Task<ProviderAvailabilityResponseDto> AddAvailabilityAsync(
        Guid providerId,
        AddProviderAvailabilityRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var provider = await _context.ServiceProviders
            .FirstOrDefaultAsync(p => p.Id == providerId, cancellationToken);

        if (provider == null)
        {
            throw new EntityNotFoundException(nameof(ServiceProvider), providerId);
        }

        ValidateProviderAccess(provider);

        if (request.EndTime <= request.StartTime)
        {
            throw new ValidationException(new Dictionary<string, string[]>
            {
                { "EndTime", new[] { "End time must be later than start time." } }
            });
        }

        var targetDate = request.AvailableDateUtc.Date;
        var existingSlot = await _context.ProviderAvailability
            .FirstOrDefaultAsync(a => a.ProviderId == providerId && a.AvailableDateUtc == targetDate, cancellationToken);

        if (existingSlot != null)
        {
            existingSlot.StartTime = request.StartTime;
            existingSlot.EndTime = request.EndTime;
            existingSlot.Status = request.Status;
            existingSlot.Notes = request.Notes?.Trim();
            existingSlot.UpdatedAtUtc = DateTime.UtcNow;

            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Availability slot {SlotId} updated for Provider {ProviderId} on {Date} to {Status}",
                existingSlot.Id, providerId, existingSlot.AvailableDateUtc.ToShortDateString(), existingSlot.Status);

            return MapToDto(existingSlot);
        }

        var slot = new ProviderAvailability
        {
            Id = Guid.NewGuid(),
            ProviderId = providerId,
            AvailableDateUtc = targetDate,
            StartTime = request.StartTime,
            EndTime = request.EndTime,
            Status = request.Status,
            Notes = request.Notes?.Trim(),
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.ProviderAvailability.Add(slot);
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Availability slot {SlotId} added for Provider {ProviderId} on {Date} with status {Status}",
            slot.Id, providerId, slot.AvailableDateUtc.ToShortDateString(), slot.Status);

        return MapToDto(slot);
    }

    public async Task<ProviderAvailabilityResponseDto> UpdateAvailabilityAsync(
        Guid providerId,
        Guid availabilityId,
        UpdateProviderAvailabilityRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var provider = await _context.ServiceProviders
            .FirstOrDefaultAsync(p => p.Id == providerId, cancellationToken);

        if (provider == null)
        {
            throw new EntityNotFoundException(nameof(ServiceProvider), providerId);
        }

        ValidateProviderAccess(provider);

        if (request.EndTime <= request.StartTime)
        {
            throw new ValidationException(new Dictionary<string, string[]>
            {
                { "EndTime", new[] { "End time must be later than start time." } }
            });
        }

        var slot = await _context.ProviderAvailability
            .FirstOrDefaultAsync(a => a.Id == availabilityId && a.ProviderId == providerId, cancellationToken);

        if (slot == null)
        {
            throw new EntityNotFoundException(nameof(ProviderAvailability), availabilityId);
        }

        slot.AvailableDateUtc = request.AvailableDateUtc.Date;
        slot.StartTime = request.StartTime;
        slot.EndTime = request.EndTime;
        slot.Status = request.Status;
        slot.Notes = request.Notes?.Trim();
        slot.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Availability slot {SlotId} updated for Provider {ProviderId}", availabilityId, providerId);

        return MapToDto(slot);
    }

    public async Task<bool> DeleteAvailabilityAsync(Guid providerId, Guid availabilityId, CancellationToken cancellationToken = default)
    {
        var provider = await _context.ServiceProviders
            .FirstOrDefaultAsync(p => p.Id == providerId, cancellationToken);

        if (provider == null)
        {
            throw new EntityNotFoundException(nameof(ServiceProvider), providerId);
        }

        ValidateProviderAccess(provider);

        var slot = await _context.ProviderAvailability
            .FirstOrDefaultAsync(a => a.Id == availabilityId && a.ProviderId == providerId, cancellationToken);

        if (slot == null)
        {
            throw new EntityNotFoundException(nameof(ProviderAvailability), availabilityId);
        }

        _context.ProviderAvailability.Remove(slot);
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Availability slot {SlotId} removed from Provider {ProviderId}", availabilityId, providerId);
        return true;
    }

    private void ValidateProviderAccess(ServiceProvider provider)
    {
        if (_currentUserService.Role == UserRole.Admin || _currentUserService.Role == UserRole.Manager)
        {
            return;
        }

        if (!_currentUserService.IsAuthenticated || !_currentUserService.UserId.HasValue)
        {
            throw new UnauthorizedAccessException("User is not authenticated.");
        }

        if (provider.UserId != _currentUserService.UserId.Value)
        {
            throw new ForbiddenAccessException("You do not have permission to manage availability for this service provider.");
        }
    }

    private static ProviderAvailabilityResponseDto MapToDto(ProviderAvailability a) => new()
    {
        Id = a.Id,
        ProviderId = a.ProviderId,
        AvailableDateUtc = a.AvailableDateUtc,
        StartTime = a.StartTime,
        EndTime = a.EndTime,
        Status = a.Status,
        Notes = a.Notes,
        CreatedAtUtc = a.CreatedAtUtc
    };
}
