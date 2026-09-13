using AssetBridge.Application.Common.Interfaces;
using AssetBridge.Application.Common.Models;
using AssetBridge.Application.DTOs.Maintenance;
using AssetBridge.Application.Services.Interfaces;
using AssetBridge.Domain.Entities.Incidents;
using AssetBridge.Domain.Entities.Inspections;
using AssetBridge.Domain.Entities.Maintenance;
using AssetBridge.Domain.Entities.Providers;
using AssetBridge.Domain.Entities.Users;
using AssetBridge.Domain.Enums;
using AssetBridge.Domain.Exceptions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AssetBridge.Application.Services.Implementations;

public class MaintenanceJobService : IMaintenanceJobService
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly ILogger<MaintenanceJobService> _logger;

    public MaintenanceJobService(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        ILogger<MaintenanceJobService> logger)
    {
        _context = context;
        _currentUserService = currentUserService;
        _logger = logger;
    }

    public async Task<MaintenanceJobResponseDto> CreateJobAsync(CreateMaintenanceJobRequestDto request, CancellationToken cancellationToken = default)
    {
        var incident = await _context.Incidents
            .Include(i => i.Asset)
            .FirstOrDefaultAsync(i => i.Id == request.IncidentId, cancellationToken);

        if (incident == null)
        {
            throw new EntityNotFoundException(nameof(Incident), request.IncidentId);
        }

        var provider = await _context.ServiceProviders
            .FirstOrDefaultAsync(p => p.Id == request.ProviderId, cancellationToken);

        if (provider == null)
        {
            throw new EntityNotFoundException(nameof(ServiceProvider), request.ProviderId);
        }

        if (request.InspectionId.HasValue)
        {
            var inspection = await _context.Inspections
                .FirstOrDefaultAsync(i => i.Id == request.InspectionId.Value && i.IncidentId == request.IncidentId, cancellationToken);

            if (inspection == null)
            {
                throw new EntityNotFoundException(nameof(Inspection), request.InspectionId.Value);
            }
        }

        if (request.ScheduledEndUtc < request.ScheduledStartUtc)
        {
            throw new ValidationException(new Dictionary<string, string[]>
            {
                { "ScheduledEndUtc", new[] { "Scheduled end time cannot be earlier than scheduled start time." } }
            });
        }

        if (request.ApprovedBudget < 0)
        {
            throw new ValidationException(new Dictionary<string, string[]>
            {
                { "ApprovedBudget", new[] { "Approved budget cannot be negative." } }
            });
        }

        var job = new MaintenanceJob
        {
            Id = Guid.NewGuid(),
            IncidentId = request.IncidentId,
            ProviderId = request.ProviderId,
            InspectionId = request.InspectionId,
            Title = request.Title.Trim(),
            Description = request.Description.Trim(),
            ScheduledStartUtc = request.ScheduledStartUtc,
            ScheduledEndUtc = request.ScheduledEndUtc,
            Status = MaintenanceJobStatus.Planned,
            ApprovedBudget = request.ApprovedBudget,
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.MaintenanceJobs.Add(job);
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("MaintenanceJob {JobId} created for Incident {IncidentId} with Provider {ProviderId}",
            job.Id, request.IncidentId, request.ProviderId);

        return await GetJobByIdAsync(job.Id, cancellationToken);
    }

    public async Task<MaintenanceJobResponseDto> GetJobByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var job = await _context.MaintenanceJobs
            .AsNoTracking()
            .Include(j => j.Incident)
                .ThenInclude(i => i.Asset)
            .Include(j => j.Provider)
            .FirstOrDefaultAsync(j => j.Id == id, cancellationToken);

        if (job == null)
        {
            throw new EntityNotFoundException(nameof(MaintenanceJob), id);
        }

        ValidateJobAccess(job);

        return MapToDto(job);
    }

    public async Task<PagedResponse<MaintenanceJobResponseDto>> GetJobsAsync(MaintenanceJobQueryParametersDto query, CancellationToken cancellationToken = default)
    {
        var dbQuery = _context.MaintenanceJobs
            .AsNoTracking()
            .Include(j => j.Incident)
                .ThenInclude(i => i.Asset)
            .Include(j => j.Provider)
            .AsQueryable();

        if (_currentUserService.Role == UserRole.Owner)
        {
            var currentUserId = GetAuthenticatedUserId();
            dbQuery = dbQuery.Where(j => j.Incident.Asset.OwnerId == currentUserId);
        }
        else if (_currentUserService.Role == UserRole.ServiceProvider)
        {
            var currentUserId = GetAuthenticatedUserId();
            dbQuery = dbQuery.Where(j => j.Provider.UserId == currentUserId);
        }

        if (query.IncidentId.HasValue)
        {
            dbQuery = dbQuery.Where(j => j.IncidentId == query.IncidentId.Value);
        }

        if (query.ProviderId.HasValue)
        {
            dbQuery = dbQuery.Where(j => j.ProviderId == query.ProviderId.Value);
        }

        if (query.Status.HasValue)
        {
            dbQuery = dbQuery.Where(j => j.Status == query.Status.Value);
        }

        var totalCount = await dbQuery.CountAsync(cancellationToken);

        dbQuery = (query.SortBy?.ToLower(), query.SortDescending) switch
        {
            ("scheduledstartutc", false) => dbQuery.OrderBy(j => j.ScheduledStartUtc),
            ("scheduledstartutc", true) => dbQuery.OrderByDescending(j => j.ScheduledStartUtc),
            ("status", false) => dbQuery.OrderBy(j => j.Status),
            ("status", true) => dbQuery.OrderByDescending(j => j.Status),
            ("approvedbudget", false) => dbQuery.OrderBy(j => j.ApprovedBudget),
            ("approvedbudget", true) => dbQuery.OrderByDescending(j => j.ApprovedBudget),
            ("createdatutc", false) => dbQuery.OrderBy(j => j.CreatedAtUtc),
            _ => dbQuery.OrderByDescending(j => j.CreatedAtUtc)
        };

        var items = await dbQuery
            .Skip((query.PageNumber - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(j => MapToDto(j))
            .ToListAsync(cancellationToken);

        return new PagedResponse<MaintenanceJobResponseDto>(items, totalCount, query.PageNumber, query.PageSize);
    }

    public async Task<MaintenanceJobResponseDto> UpdateJobAsync(Guid id, UpdateMaintenanceJobRequestDto request, CancellationToken cancellationToken = default)
    {
        var job = await _context.MaintenanceJobs
            .Include(j => j.Incident)
                .ThenInclude(i => i.Asset)
            .Include(j => j.Provider)
            .FirstOrDefaultAsync(j => j.Id == id, cancellationToken);

        if (job == null)
        {
            throw new EntityNotFoundException(nameof(MaintenanceJob), id);
        }

        ValidateJobModification(job);

        if (request.ScheduledEndUtc < request.ScheduledStartUtc)
        {
            throw new ValidationException(new Dictionary<string, string[]>
            {
                { "ScheduledEndUtc", new[] { "Scheduled end time cannot be earlier than scheduled start time." } }
            });
        }

        if (request.ApprovedBudget < 0)
        {
            throw new ValidationException(new Dictionary<string, string[]>
            {
                { "ApprovedBudget", new[] { "Approved budget cannot be negative." } }
            });
        }

        if (request.ActualCost.HasValue && request.ActualCost.Value < 0)
        {
            throw new ValidationException(new Dictionary<string, string[]>
            {
                { "ActualCost", new[] { "Actual cost cannot be negative." } }
            });
        }

        job.Title = request.Title.Trim();
        job.Description = request.Description.Trim();
        job.ScheduledStartUtc = request.ScheduledStartUtc;
        job.ScheduledEndUtc = request.ScheduledEndUtc;
        job.ApprovedBudget = request.ApprovedBudget;
        job.ActualCost = request.ActualCost;
        job.CompletionNotes = request.CompletionNotes?.Trim();
        job.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("MaintenanceJob {JobId} updated", id);

        return MapToDto(job);
    }

    public async Task<MaintenanceJobResponseDto> UpdateJobStatusAsync(Guid id, UpdateMaintenanceJobStatusRequestDto request, CancellationToken cancellationToken = default)
    {
        var job = await _context.MaintenanceJobs
            .Include(j => j.Incident)
                .ThenInclude(i => i.Asset)
            .Include(j => j.Provider)
            .FirstOrDefaultAsync(j => j.Id == id, cancellationToken);

        if (job == null)
        {
            throw new EntityNotFoundException(nameof(MaintenanceJob), id);
        }

        ValidateJobModification(job);

        if (request.ActualCost.HasValue && request.ActualCost.Value < 0)
        {
            throw new ValidationException(new Dictionary<string, string[]>
            {
                { "ActualCost", new[] { "Actual cost cannot be negative." } }
            });
        }

        if (request.Status == MaintenanceJobStatus.Completed)
        {
            job.CompletedAtUtc = request.CompletedAtUtc ?? DateTime.UtcNow;
        }

        if (request.ActualCost.HasValue)
        {
            job.ActualCost = request.ActualCost.Value;
        }

        if (!string.IsNullOrWhiteSpace(request.CompletionNotes))
        {
            job.CompletionNotes = request.CompletionNotes.Trim();
        }

        job.Status = request.Status;
        job.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("MaintenanceJob {JobId} status updated to {Status}", id, request.Status);

        return MapToDto(job);
    }

    private void ValidateJobAccess(MaintenanceJob job)
    {
        if (_currentUserService.Role == UserRole.Admin || _currentUserService.Role == UserRole.Manager)
        {
            return;
        }

        var currentUserId = GetAuthenticatedUserId();

        if (_currentUserService.Role == UserRole.Owner && job.Incident?.Asset != null)
        {
            if (job.Incident.Asset.OwnerId != currentUserId)
            {
                throw new UnauthorizedAccessException("You do not have permission to view this maintenance job.");
            }
        }
        else if (_currentUserService.Role == UserRole.ServiceProvider && job.Provider != null)
        {
            if (job.Provider.UserId != currentUserId)
            {
                throw new UnauthorizedAccessException("You do not have permission to view this maintenance job.");
            }
        }
    }

    private void ValidateJobModification(MaintenanceJob job)
    {
        if (_currentUserService.Role == UserRole.Admin || _currentUserService.Role == UserRole.Manager)
        {
            return;
        }

        var currentUserId = GetAuthenticatedUserId();

        if (_currentUserService.Role == UserRole.ServiceProvider)
        {
            if (job.Provider == null || job.Provider.UserId != currentUserId)
            {
                throw new UnauthorizedAccessException("You do not have permission to modify this maintenance job.");
            }
        }
        else
        {
            throw new UnauthorizedAccessException("You do not have permission to modify this maintenance job.");
        }
    }

    private Guid GetAuthenticatedUserId()
    {
        if (!_currentUserService.IsAuthenticated || !_currentUserService.UserId.HasValue)
        {
            throw new UnauthorizedAccessException("User is not authenticated.");
        }

        return _currentUserService.UserId.Value;
    }

    private static MaintenanceJobResponseDto MapToDto(MaintenanceJob j) => new()
    {
        Id = j.Id,
        IncidentId = j.IncidentId,
        IncidentTitle = j.Incident?.Title ?? string.Empty,
        ProviderId = j.ProviderId,
        ProviderBusinessName = j.Provider?.BusinessName ?? string.Empty,
        InspectionId = j.InspectionId,
        Title = j.Title,
        Description = j.Description,
        ScheduledStartUtc = j.ScheduledStartUtc,
        ScheduledEndUtc = j.ScheduledEndUtc,
        Status = j.Status,
        ApprovedBudget = j.ApprovedBudget,
        ActualCost = j.ActualCost,
        CompletedAtUtc = j.CompletedAtUtc,
        CompletionNotes = j.CompletionNotes,
        CreatedAtUtc = j.CreatedAtUtc,
        UpdatedAtUtc = j.UpdatedAtUtc
    };
}
