using AssetBridge.Application.Common.Interfaces;
using AssetBridge.Application.DTOs.Inspections;
using AssetBridge.Application.Services.Interfaces;
using AssetBridge.Domain.Entities.Inspections;
using AssetBridge.Domain.Entities.Users;
using AssetBridge.Domain.Enums;
using AssetBridge.Domain.Exceptions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AssetBridge.Application.Services.Implementations;

public class InspectionFindingService : IInspectionFindingService
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly ILogger<InspectionFindingService> _logger;

    public InspectionFindingService(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        ILogger<InspectionFindingService> logger)
    {
        _context = context;
        _currentUserService = currentUserService;
        _logger = logger;
    }

    public async Task<IReadOnlyList<InspectionFindingResponseDto>> GetFindingsByInspectionIdAsync(Guid inspectionId, CancellationToken cancellationToken = default)
    {
        var exists = await _context.Inspections.AnyAsync(i => i.Id == inspectionId, cancellationToken);
        if (!exists)
        {
            throw new EntityNotFoundException(nameof(Inspection), inspectionId);
        }

        var findings = await _context.InspectionFindings
            .AsNoTracking()
            .Where(f => f.InspectionId == inspectionId)
            .OrderBy(f => f.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        return findings.Select(MapToDto).ToList();
    }

    public async Task<InspectionFindingResponseDto> AddFindingAsync(Guid inspectionId, CreateInspectionFindingRequestDto request, CancellationToken cancellationToken = default)
    {
        var inspection = await _context.Inspections
            .Include(i => i.InspectorProvider)
            .FirstOrDefaultAsync(i => i.Id == inspectionId, cancellationToken);

        if (inspection == null)
        {
            throw new EntityNotFoundException(nameof(Inspection), inspectionId);
        }

        ValidateInspectionAccess(inspection);

        var finding = new InspectionFinding
        {
            Id = Guid.NewGuid(),
            InspectionId = inspectionId,
            Description = request.Description.Trim(),
            Severity = request.Severity,
            Recommendation = request.Recommendation.Trim(),
            EvidenceReference = request.EvidenceReference?.Trim(),
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.InspectionFindings.Add(finding);
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Finding {FindingId} added to Inspection {InspectionId}", finding.Id, inspectionId);

        return MapToDto(finding);
    }

    public async Task<InspectionFindingResponseDto> UpdateFindingAsync(Guid inspectionId, Guid findingId, UpdateInspectionFindingRequestDto request, CancellationToken cancellationToken = default)
    {
        var inspection = await _context.Inspections
            .Include(i => i.InspectorProvider)
            .FirstOrDefaultAsync(i => i.Id == inspectionId, cancellationToken);

        if (inspection == null)
        {
            throw new EntityNotFoundException(nameof(Inspection), inspectionId);
        }

        ValidateInspectionAccess(inspection);

        var finding = await _context.InspectionFindings
            .FirstOrDefaultAsync(f => f.Id == findingId && f.InspectionId == inspectionId, cancellationToken);

        if (finding == null)
        {
            throw new EntityNotFoundException(nameof(InspectionFinding), findingId);
        }

        finding.Description = request.Description.Trim();
        finding.Severity = request.Severity;
        finding.Recommendation = request.Recommendation.Trim();
        finding.EvidenceReference = request.EvidenceReference?.Trim();
        finding.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Finding {FindingId} updated in Inspection {InspectionId}", findingId, inspectionId);

        return MapToDto(finding);
    }

    public async Task<bool> RemoveFindingAsync(Guid inspectionId, Guid findingId, CancellationToken cancellationToken = default)
    {
        var inspection = await _context.Inspections
            .Include(i => i.InspectorProvider)
            .FirstOrDefaultAsync(i => i.Id == inspectionId, cancellationToken);

        if (inspection == null)
        {
            throw new EntityNotFoundException(nameof(Inspection), inspectionId);
        }

        ValidateInspectionAccess(inspection);

        var finding = await _context.InspectionFindings
            .FirstOrDefaultAsync(f => f.Id == findingId && f.InspectionId == inspectionId, cancellationToken);

        if (finding == null)
        {
            throw new EntityNotFoundException(nameof(InspectionFinding), findingId);
        }

        _context.InspectionFindings.Remove(finding);
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Finding {FindingId} removed from Inspection {InspectionId}", findingId, inspectionId);
        return true;
    }

    private void ValidateInspectionAccess(Inspection inspection)
    {
        if (_currentUserService.Role == UserRole.Admin || _currentUserService.Role == UserRole.Manager)
        {
            return;
        }

        if (!_currentUserService.IsAuthenticated || !_currentUserService.UserId.HasValue)
        {
            throw new UnauthorizedAccessException("User is not authenticated.");
        }

        if (inspection.InspectorProvider == null || inspection.InspectorProvider.UserId != _currentUserService.UserId.Value)
        {
            throw new UnauthorizedAccessException("You do not have permission to modify findings for this inspection.");
        }
    }

    private static InspectionFindingResponseDto MapToDto(InspectionFinding f) => new()
    {
        Id = f.Id,
        InspectionId = f.InspectionId,
        Description = f.Description,
        Severity = f.Severity,
        Recommendation = f.Recommendation,
        EvidenceReference = f.EvidenceReference,
        CreatedAtUtc = f.CreatedAtUtc
    };
}
