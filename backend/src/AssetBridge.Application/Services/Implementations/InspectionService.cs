using AssetBridge.Application.Common.Interfaces;
using AssetBridge.Application.Common.Models;
using AssetBridge.Application.DTOs.Inspections;
using AssetBridge.Application.Services.Interfaces;
using AssetBridge.Domain.Entities.Incidents;
using AssetBridge.Domain.Entities.Inspections;
using AssetBridge.Domain.Entities.Providers;
using AssetBridge.Domain.Entities.Users;
using AssetBridge.Domain.Enums;
using AssetBridge.Domain.Exceptions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AssetBridge.Application.Services.Implementations;

public class InspectionService : IInspectionService
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly ILogger<InspectionService> _logger;

    public InspectionService(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        ILogger<InspectionService> logger)
    {
        _context = context;
        _currentUserService = currentUserService;
        _logger = logger;
    }

    public async Task<InspectionResponseDto> CreateInspectionAsync(CreateInspectionRequestDto request, CancellationToken cancellationToken = default)
    {
        var incident = await _context.Incidents
            .Include(i => i.Asset)
            .FirstOrDefaultAsync(i => i.Id == request.IncidentId, cancellationToken);

        if (incident == null)
        {
            throw new EntityNotFoundException(nameof(Incident), request.IncidentId);
        }

        var provider = await _context.ServiceProviders
            .FirstOrDefaultAsync(p => p.Id == request.InspectorProviderId, cancellationToken);

        if (provider == null)
        {
            throw new EntityNotFoundException(nameof(ServiceProvider), request.InspectorProviderId);
        }

        var inspection = new Inspection
        {
            Id = Guid.NewGuid(),
            IncidentId = request.IncidentId,
            InspectorProviderId = request.InspectorProviderId,
            ScheduledAtUtc = request.ScheduledAtUtc,
            Status = InspectionStatus.Scheduled,
            Notes = request.Notes?.Trim(),
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.Inspections.Add(inspection);
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Inspection {InspectionId} created for Incident {IncidentId} with Inspector {ProviderId}",
            inspection.Id, request.IncidentId, request.InspectorProviderId);

        return await GetInspectionByIdAsync(inspection.Id, cancellationToken);
    }

    public async Task<InspectionResponseDto> GetInspectionByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var inspection = await _context.Inspections
            .AsNoTracking()
            .Include(i => i.Incident)
                .ThenInclude(inc => inc.Asset)
            .Include(i => i.InspectorProvider)
            .Include(i => i.Findings)
            .FirstOrDefaultAsync(i => i.Id == id, cancellationToken);

        if (inspection == null)
        {
            throw new EntityNotFoundException(nameof(Inspection), id);
        }

        ValidateInspectionAccess(inspection);

        return MapToDto(inspection);
    }

    public async Task<PagedResponse<InspectionResponseDto>> GetInspectionsAsync(InspectionQueryParametersDto query, CancellationToken cancellationToken = default)
    {
        var dbQuery = _context.Inspections
            .AsNoTracking()
            .Include(i => i.Incident)
                .ThenInclude(inc => inc.Asset)
            .Include(i => i.InspectorProvider)
            .Include(i => i.Findings)
            .AsQueryable();

        // RBAC Isolation
        if (_currentUserService.Role == UserRole.Owner)
        {
            var currentUserId = GetAuthenticatedUserId();
            dbQuery = dbQuery.Where(i => i.Incident.Asset.OwnerId == currentUserId);
        }
        else if (_currentUserService.Role == UserRole.ServiceProvider)
        {
            var currentUserId = GetAuthenticatedUserId();
            dbQuery = dbQuery.Where(i => i.InspectorProvider.UserId == currentUserId);
        }

        if (query.IncidentId.HasValue)
        {
            dbQuery = dbQuery.Where(i => i.IncidentId == query.IncidentId.Value);
        }

        if (query.InspectorProviderId.HasValue)
        {
            dbQuery = dbQuery.Where(i => i.InspectorProviderId == query.InspectorProviderId.Value);
        }

        if (query.Status.HasValue)
        {
            dbQuery = dbQuery.Where(i => i.Status == query.Status.Value);
        }

        var totalCount = await dbQuery.CountAsync(cancellationToken);

        dbQuery = (query.SortBy?.ToLower(), query.SortDescending) switch
        {
            ("scheduledatutc", false) => dbQuery.OrderBy(i => i.ScheduledAtUtc),
            ("scheduledatutc", true) => dbQuery.OrderByDescending(i => i.ScheduledAtUtc),
            ("status", false) => dbQuery.OrderBy(i => i.Status),
            ("status", true) => dbQuery.OrderByDescending(i => i.Status),
            ("createdatutc", false) => dbQuery.OrderBy(i => i.CreatedAtUtc),
            _ => dbQuery.OrderByDescending(i => i.CreatedAtUtc)
        };

        var items = await dbQuery
            .Skip((query.PageNumber - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(i => MapToDto(i))
            .ToListAsync(cancellationToken);

        return new PagedResponse<InspectionResponseDto>(items, totalCount, query.PageNumber, query.PageSize);
    }

    public async Task<InspectionResponseDto> UpdateInspectionAsync(Guid id, UpdateInspectionRequestDto request, CancellationToken cancellationToken = default)
    {
        var inspection = await _context.Inspections
            .Include(i => i.Incident)
                .ThenInclude(inc => inc.Asset)
            .Include(i => i.InspectorProvider)
            .Include(i => i.Findings)
            .FirstOrDefaultAsync(i => i.Id == id, cancellationToken);

        if (inspection == null)
        {
            throw new EntityNotFoundException(nameof(Inspection), id);
        }

        ValidateInspectionModification(inspection);

        if (request.CompletedAtUtc.HasValue && request.CompletedAtUtc.Value < request.ScheduledAtUtc)
        {
            throw new ValidationException(new Dictionary<string, string[]>
            {
                { "CompletedAtUtc", new[] { "Completion date cannot be earlier than scheduled inspection date." } }
            });
        }

        inspection.ScheduledAtUtc = request.ScheduledAtUtc;
        inspection.CompletedAtUtc = request.CompletedAtUtc;
        inspection.Summary = request.Summary?.Trim();
        inspection.Notes = request.Notes?.Trim();
        inspection.EstimatedSeverity = request.EstimatedSeverity;
        inspection.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Inspection {InspectionId} updated", id);

        return MapToDto(inspection);
    }

    public async Task<InspectionResponseDto> UpdateInspectionStatusAsync(Guid id, UpdateInspectionStatusRequestDto request, CancellationToken cancellationToken = default)
    {
        var inspection = await _context.Inspections
            .Include(i => i.Incident)
                .ThenInclude(inc => inc.Asset)
            .Include(i => i.InspectorProvider)
            .Include(i => i.Findings)
            .FirstOrDefaultAsync(i => i.Id == id, cancellationToken);

        if (inspection == null)
        {
            throw new EntityNotFoundException(nameof(Inspection), id);
        }

        ValidateInspectionModification(inspection);

        // Completion rule: cannot complete inspection without summary or findings
        if (request.Status == InspectionStatus.Completed)
        {
            if (string.IsNullOrWhiteSpace(request.Summary) && string.IsNullOrWhiteSpace(inspection.Summary) && !inspection.Findings.Any())
            {
                throw new ValidationException(new Dictionary<string, string[]>
                {
                    { "Status", new[] { "An inspection cannot be marked completed without inspection findings or an assessment summary." } }
                });
            }

            inspection.CompletedAtUtc = request.CompletedAtUtc ?? DateTime.UtcNow;
        }

        if (!string.IsNullOrWhiteSpace(request.Summary))
        {
            inspection.Summary = request.Summary.Trim();
        }

        inspection.Status = request.Status;
        inspection.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Inspection {InspectionId} status updated to {Status}", id, request.Status);

        return MapToDto(inspection);
    }

    private void ValidateInspectionAccess(Inspection inspection)
    {
        if (_currentUserService.Role == UserRole.Admin || _currentUserService.Role == UserRole.Manager)
        {
            return;
        }

        var currentUserId = GetAuthenticatedUserId();

        if (_currentUserService.Role == UserRole.Owner && inspection.Incident?.Asset != null)
        {
            if (inspection.Incident.Asset.OwnerId != currentUserId)
            {
                throw new UnauthorizedAccessException("You do not have permission to view this inspection.");
            }
        }
        else if (_currentUserService.Role == UserRole.ServiceProvider && inspection.InspectorProvider != null)
        {
            if (inspection.InspectorProvider.UserId != currentUserId)
            {
                throw new UnauthorizedAccessException("You do not have permission to view this inspection.");
            }
        }
    }

    private void ValidateInspectionModification(Inspection inspection)
    {
        if (_currentUserService.Role == UserRole.Admin || _currentUserService.Role == UserRole.Manager)
        {
            return;
        }

        var currentUserId = GetAuthenticatedUserId();

        if (_currentUserService.Role == UserRole.ServiceProvider)
        {
            if (inspection.InspectorProvider == null || inspection.InspectorProvider.UserId != currentUserId)
            {
                throw new UnauthorizedAccessException("You do not have permission to modify this inspection.");
            }
        }
        else
        {
            throw new UnauthorizedAccessException("You do not have permission to modify this inspection.");
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

    private static InspectionResponseDto MapToDto(Inspection i) => new()
    {
        Id = i.Id,
        IncidentId = i.IncidentId,
        IncidentTitle = i.Incident?.Title ?? string.Empty,
        InspectorProviderId = i.InspectorProviderId,
        InspectorBusinessName = i.InspectorProvider?.BusinessName ?? string.Empty,
        ScheduledAtUtc = i.ScheduledAtUtc,
        CompletedAtUtc = i.CompletedAtUtc,
        Status = i.Status,
        Summary = i.Summary,
        Notes = i.Notes,
        EstimatedSeverity = i.EstimatedSeverity,
        CreatedAtUtc = i.CreatedAtUtc,
        UpdatedAtUtc = i.UpdatedAtUtc,
        Findings = i.Findings?.Select(f => new InspectionFindingResponseDto
        {
            Id = f.Id,
            InspectionId = f.InspectionId,
            Description = f.Description,
            Severity = f.Severity,
            Recommendation = f.Recommendation,
            EvidenceReference = f.EvidenceReference,
            CreatedAtUtc = f.CreatedAtUtc
        }).ToList() ?? new List<InspectionFindingResponseDto>()
    };
}
