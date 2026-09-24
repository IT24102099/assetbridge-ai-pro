using AssetBridge.Application.Common.Interfaces;
using AssetBridge.Application.Common.Models;
using AssetBridge.Application.DTOs.Incidents;
using AssetBridge.Application.Services.Interfaces;
using AssetBridge.Domain.Entities.Incidents;
using AssetBridge.Domain.Enums;
using AssetBridge.Domain.Exceptions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AssetBridge.Application.Services.Implementations;

// Manages incident lifecycle, evidence attachments, and business validation.
public class IncidentService : IIncidentService
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IAssetHistoryService _historyService;
    private readonly ILogger<IncidentService> _logger;

    public IncidentService(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IAssetHistoryService historyService,
        ILogger<IncidentService> logger)
    {
        _context = context;
        _currentUserService = currentUserService;
        _historyService = historyService;
        _logger = logger;
    }

    public async Task<IncidentResponseDto> CreateIncidentAsync(CreateIncidentRequestDto request, CancellationToken cancellationToken = default)
    {
        var currentUserId = GetAuthenticatedUserId();

        // 1. Validate Estimated Budget
        if (request.EstimatedBudget.HasValue && request.EstimatedBudget.Value < 0)
        {
            throw new ValidationException("EstimatedBudget", "Estimated budget cannot be a negative amount.");
        }

        // 2. Validate Target Deadline
        if (request.RequiredByUtc.HasValue && request.RequiredByUtc.Value < DateTime.UtcNow.AddMinutes(-5))
        {
            throw new ValidationException("RequiredByUtc", "Deadline date must be in the future.");
        }

        // 3. Verify referenced Asset exists and is active
        var asset = await _context.Assets
            .FirstOrDefaultAsync(a => a.Id == request.AssetId, cancellationToken);

        if (asset == null)
        {
            throw new EntityNotFoundException("Asset", request.AssetId);
        }

        if (asset.Status == AssetStatus.Archived || asset.Status == AssetStatus.Inactive)
        {
            throw new DomainException($"Cannot report an incident on a property with status '{asset.Status}'.");
        }

        // 4. Enforce owner isolation
        if (_currentUserService.Role == UserRole.Owner && asset.OwnerId != currentUserId)
        {
            throw new UnauthorizedAccessException("You do not have permission to report incidents for this asset.");
        }

        var incident = new Incident
        {
            Id = Guid.NewGuid(),
            AssetId = request.AssetId,
            ReportedByUserId = currentUserId,
            Title = request.Title.Trim(),
            Description = request.Description.Trim(),
            Category = request.Category,
            Priority = request.Priority,
            Status = IncidentStatus.Reported,
            EstimatedBudget = request.EstimatedBudget,
            RequiredByUtc = request.RequiredByUtc,
            LocationDetails = request.LocationDetails?.Trim(),
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.Incidents.Add(incident);
        await _context.SaveChangesAsync(cancellationToken);

        await _historyService.RecordEventAsync(
            asset.Id,
            AssetHistoryEventType.IncidentReported,
            "Incident Reported",
            $"Incident '{incident.Title}' ({incident.Category}, {incident.Priority} priority) was reported.",
            currentUserId,
            relatedIncidentId: incident.Id,
            cancellationToken: cancellationToken);

        _logger.LogInformation("Incident created: {IncidentId} for Asset {AssetId}", incident.Id, asset.Id);

        return await GetIncidentByIdAsync(incident.Id, cancellationToken);
    }

    public async Task<IncidentResponseDto> GetIncidentByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var incident = await _context.Incidents
            .AsNoTracking()
            .Include(i => i.Asset)
            .Include(i => i.ReportedByUser)
            .Include(i => i.EvidenceItems)
                .ThenInclude(e => e.UploadedByUser)
            .FirstOrDefaultAsync(i => i.Id == id, cancellationToken);

        if (incident == null)
        {
            throw new EntityNotFoundException(nameof(Incident), id);
        }

        ValidateIncidentAccess(incident);

        return MapToDto(incident);
    }

    public async Task<PagedResponse<IncidentResponseDto>> GetIncidentsAsync(IncidentQueryParametersDto query, CancellationToken cancellationToken = default)
    {
        var dbQuery = _context.Incidents
            .AsNoTracking()
            .Include(i => i.Asset)
            .Include(i => i.ReportedByUser)
            .Include(i => i.EvidenceItems)
                .ThenInclude(e => e.UploadedByUser)
            .AsQueryable();

        // If caller is an Owner, restrict incidents to properties they own
        if (_currentUserService.Role == UserRole.Owner)
        {
            var currentUserId = GetAuthenticatedUserId();
            dbQuery = dbQuery.Where(i => i.Asset.OwnerId == currentUserId);
        }

        if (query.AssetId.HasValue)
        {
            dbQuery = dbQuery.Where(i => i.AssetId == query.AssetId.Value);
        }

        if (query.Category.HasValue)
        {
            dbQuery = dbQuery.Where(i => i.Category == query.Category.Value);
        }

        if (query.Priority.HasValue)
        {
            dbQuery = dbQuery.Where(i => i.Priority == query.Priority.Value);
        }

        if (query.Status.HasValue)
        {
            dbQuery = dbQuery.Where(i => i.Status == query.Status.Value);
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim().ToLower();
            dbQuery = dbQuery.Where(i =>
                i.Title.ToLower().Contains(search) ||
                i.Description.ToLower().Contains(search) ||
                i.Asset.Name.ToLower().Contains(search));
        }

        var totalCount = await dbQuery.CountAsync(cancellationToken);

        // Apply dynamic sorting server-side
        dbQuery = (query.SortBy?.ToLower(), query.SortDescending) switch
        {
            ("title", false) => dbQuery.OrderBy(i => i.Title),
            ("title", true) => dbQuery.OrderByDescending(i => i.Title),
            ("priority", false) => dbQuery.OrderBy(i => i.Priority),
            ("priority", true) => dbQuery.OrderByDescending(i => i.Priority),
            ("status", false) => dbQuery.OrderBy(i => i.Status),
            ("status", true) => dbQuery.OrderByDescending(i => i.Status),
            ("createdatutc", false) => dbQuery.OrderBy(i => i.CreatedAtUtc),
            _ => dbQuery.OrderByDescending(i => i.CreatedAtUtc)
        };

        var items = await dbQuery
            .Skip((query.PageNumber - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync(cancellationToken);

        var dtos = items.Select(MapToDto).ToList();

        return new PagedResponse<IncidentResponseDto>(dtos, totalCount, query.PageNumber, query.PageSize);
    }

    public async Task<IncidentResponseDto> UpdateIncidentAsync(Guid id, UpdateIncidentRequestDto request, CancellationToken cancellationToken = default)
    {
        var incident = await _context.Incidents
            .Include(i => i.Asset)
            .FirstOrDefaultAsync(i => i.Id == id, cancellationToken);

        if (incident == null)
        {
            throw new EntityNotFoundException(nameof(Incident), id);
        }

        ValidateIncidentAccess(incident);

        if (request.EstimatedBudget.HasValue && request.EstimatedBudget.Value < 0)
        {
            throw new ValidationException("EstimatedBudget", "Estimated budget cannot be negative.");
        }

        if (request.RequiredByUtc.HasValue && request.RequiredByUtc.Value < DateTime.UtcNow.AddMinutes(-5))
        {
            throw new ValidationException("RequiredByUtc", "Deadline date must be in the future.");
        }

        incident.Title = request.Title.Trim();
        incident.Description = request.Description.Trim();
        incident.Category = request.Category;
        incident.Priority = request.Priority;
        incident.EstimatedBudget = request.EstimatedBudget;
        incident.RequiredByUtc = request.RequiredByUtc;
        incident.LocationDetails = request.LocationDetails?.Trim();
        incident.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Incident updated: {IncidentId}", incident.Id);

        return await GetIncidentByIdAsync(incident.Id, cancellationToken);
    }

    public async Task<IncidentResponseDto> UpdateIncidentStatusAsync(Guid id, UpdateIncidentStatusRequestDto request, CancellationToken cancellationToken = default)
    {
        var incident = await _context.Incidents
            .Include(i => i.Asset)
            .FirstOrDefaultAsync(i => i.Id == id, cancellationToken);

        if (incident == null)
        {
            throw new EntityNotFoundException(nameof(Incident), id);
        }

        ValidateIncidentAccess(incident);

        // State Machine validation: Validate allowable status transitions
        if (!IsValidStatusTransition(incident.Status, request.Status))
        {
            throw new DomainException($"Invalid status transition from '{incident.Status}' to '{request.Status}'.");
        }

        var previousStatus = incident.Status;
        incident.Status = request.Status;
        incident.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        await _historyService.RecordEventAsync(
            incident.AssetId,
            AssetHistoryEventType.IncidentStatusChanged,
            "Incident Status Updated",
            $"Incident '{incident.Title}' status changed from {previousStatus} to {incident.Status}. Reason: {request.StatusChangeReason ?? "Not specified"}",
            _currentUserService.UserId,
            relatedIncidentId: incident.Id,
            cancellationToken: cancellationToken);

        _logger.LogInformation("Incident {IncidentId} status transitioned from {Prev} to {New}", id, previousStatus, request.Status);

        return await GetIncidentByIdAsync(incident.Id, cancellationToken);
    }

    public async Task<IncidentEvidenceResponseDto> AddEvidenceAsync(Guid incidentId, AddIncidentEvidenceRequestDto request, CancellationToken cancellationToken = default)
    {
        var currentUserId = GetAuthenticatedUserId();

        var incident = await _context.Incidents
            .Include(i => i.Asset)
            .FirstOrDefaultAsync(i => i.Id == incidentId, cancellationToken);

        if (incident == null)
        {
            throw new EntityNotFoundException(nameof(Incident), incidentId);
        }

        ValidateIncidentAccess(incident);

        var evidence = new IncidentEvidence
        {
            Id = Guid.NewGuid(),
            IncidentId = incidentId,
            UploadedByUserId = currentUserId,
            FileUrl = request.FileUrl.Trim(),
            FileName = request.FileName.Trim(),
            FileType = request.FileType?.Trim(),
            FileSizeBytes = request.FileSizeBytes,
            EvidenceType = request.EvidenceType,
            Caption = request.Caption?.Trim(),
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.IncidentEvidence.Add(evidence);
        await _context.SaveChangesAsync(cancellationToken);

        await _historyService.RecordEventAsync(
            incident.AssetId,
            AssetHistoryEventType.EvidenceAdded,
            "Evidence Added",
            $"{evidence.EvidenceType} evidence '{evidence.FileName}' added to incident '{incident.Title}'.",
            currentUserId,
            relatedIncidentId: incident.Id,
            cancellationToken: cancellationToken);

        _logger.LogInformation("Evidence {EvidenceId} added to Incident {IncidentId}", evidence.Id, incidentId);

        var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == currentUserId, cancellationToken);

        return new IncidentEvidenceResponseDto
        {
            Id = evidence.Id,
            IncidentId = evidence.IncidentId,
            UploadedByUserId = evidence.UploadedByUserId,
            UploadedByUserName = user?.FullName ?? "System",
            FileUrl = evidence.FileUrl,
            FileName = evidence.FileName,
            FileType = evidence.FileType,
            FileSizeBytes = evidence.FileSizeBytes,
            EvidenceType = evidence.EvidenceType,
            Caption = evidence.Caption,
            CreatedAtUtc = evidence.CreatedAtUtc
        };
    }

    public async Task<IReadOnlyList<IncidentEvidenceResponseDto>> GetIncidentEvidenceAsync(Guid incidentId, CancellationToken cancellationToken = default)
    {
        var incident = await _context.Incidents
            .AsNoTracking()
            .Include(i => i.Asset)
            .FirstOrDefaultAsync(i => i.Id == incidentId, cancellationToken);

        if (incident == null)
        {
            throw new EntityNotFoundException(nameof(Incident), incidentId);
        }

        ValidateIncidentAccess(incident);

        return await _context.IncidentEvidence
            .AsNoTracking()
            .Where(e => e.IncidentId == incidentId)
            .Include(e => e.UploadedByUser)
            .OrderByDescending(e => e.CreatedAtUtc)
            .Select(e => new IncidentEvidenceResponseDto
            {
                Id = e.Id,
                IncidentId = e.IncidentId,
                UploadedByUserId = e.UploadedByUserId,
                UploadedByUserName = e.UploadedByUser != null ? e.UploadedByUser.FullName : "User",
                FileUrl = e.FileUrl,
                FileName = e.FileName,
                FileType = e.FileType,
                FileSizeBytes = e.FileSizeBytes,
                EvidenceType = e.EvidenceType,
                Caption = e.Caption,
                CreatedAtUtc = e.CreatedAtUtc
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<bool> DeleteEvidenceAsync(Guid incidentId, Guid evidenceId, CancellationToken cancellationToken = default)
    {
        var evidence = await _context.IncidentEvidence
            .Include(e => e.Incident)
                .ThenInclude(i => i.Asset)
            .FirstOrDefaultAsync(e => e.Id == evidenceId && e.IncidentId == incidentId, cancellationToken);

        if (evidence == null)
        {
            throw new EntityNotFoundException(nameof(IncidentEvidence), evidenceId);
        }

        ValidateIncidentAccess(evidence.Incident);

        _context.IncidentEvidence.Remove(evidence);
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Evidence {EvidenceId} deleted from Incident {IncidentId}", evidenceId, incidentId);

        return true;
    }

    private Guid GetAuthenticatedUserId()
    {
        if (!_currentUserService.IsAuthenticated || !_currentUserService.UserId.HasValue)
        {
            throw new UnauthorizedAccessException("User is not authenticated.");
        }

        return _currentUserService.UserId.Value;
    }

    private void ValidateIncidentAccess(Incident incident)
    {
        if (_currentUserService.Role == UserRole.Owner)
        {
            var currentUserId = GetAuthenticatedUserId();
            if (incident.Asset != null && incident.Asset.OwnerId != currentUserId)
            {
                _logger.LogWarning("Unauthorized access attempt by Owner {UserId} on Incident {IncidentId}", currentUserId, incident.Id);
                throw new UnauthorizedAccessException("You do not have permission to access this incident.");
            }
        }
    }

    private static bool IsValidStatusTransition(IncidentStatus current, IncidentStatus target)
    {
        if (current == target) return true;

        return current switch
        {
            IncidentStatus.Reported => target is IncidentStatus.Validating or IncidentStatus.Planning or IncidentStatus.Cancelled,
            IncidentStatus.Validating => target is IncidentStatus.Planning or IncidentStatus.Cancelled,
            IncidentStatus.Planning => target is IncidentStatus.ProviderSelection or IncidentStatus.InspectionPending or IncidentStatus.Cancelled,
            IncidentStatus.ProviderSelection => target is IncidentStatus.InspectionPending or IncidentStatus.WorkInProgress or IncidentStatus.Cancelled,
            IncidentStatus.InspectionPending => target is IncidentStatus.WorkInProgress or IncidentStatus.Planning or IncidentStatus.Cancelled,
            IncidentStatus.WorkInProgress => target is IncidentStatus.Resolved or IncidentStatus.Cancelled,
            IncidentStatus.Resolved => target is IncidentStatus.Closed or IncidentStatus.WorkInProgress,
            _ => false // Terminal states: Closed and Cancelled cannot transition
        };
    }

    private static IncidentResponseDto MapToDto(Incident incident)
    {
        return new IncidentResponseDto
        {
            Id = incident.Id,
            AssetId = incident.AssetId,
            AssetName = incident.Asset?.Name ?? string.Empty,
            AssetCity = incident.Asset?.City ?? string.Empty,
            ReportedByUserId = incident.ReportedByUserId,
            ReportedByUserName = incident.ReportedByUser?.FullName ?? string.Empty,
            ReportedByUserEmail = incident.ReportedByUser?.Email ?? string.Empty,
            Title = incident.Title,
            Description = incident.Description,
            Category = incident.Category,
            Priority = incident.Priority,
            Status = incident.Status,
            EstimatedBudget = incident.EstimatedBudget,
            RequiredByUtc = incident.RequiredByUtc,
            LocationDetails = incident.LocationDetails,
            EvidenceCount = incident.EvidenceItems.Count,
            Evidence = incident.EvidenceItems.Select(e => new IncidentEvidenceResponseDto
            {
                Id = e.Id,
                IncidentId = e.IncidentId,
                UploadedByUserId = e.UploadedByUserId,
                UploadedByUserName = e.UploadedByUser?.FullName ?? string.Empty,
                FileUrl = e.FileUrl,
                FileName = e.FileName,
                FileType = e.FileType,
                FileSizeBytes = e.FileSizeBytes,
                EvidenceType = e.EvidenceType,
                Caption = e.Caption,
                CreatedAtUtc = e.CreatedAtUtc
            }).ToList(),
            CreatedAtUtc = incident.CreatedAtUtc,
            UpdatedAtUtc = incident.UpdatedAtUtc
        };
    }
}
