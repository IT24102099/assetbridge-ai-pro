using AssetBridge.Application.Common.Interfaces;
using AssetBridge.Application.Common.Models;
using AssetBridge.Application.DTOs.Workflow;
using AssetBridge.Application.Services.Interfaces;
using AssetBridge.Domain.Entities.Workflow;
using AssetBridge.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace AssetBridge.Application.Services.Implementations;

// Implements append-only audit event logging and retrieval.
// Audit events provide non-repudiation, tamper-evident governance, and full lifecycle traceability.
public class AuditService : IAuditService
{
    private readonly IApplicationDbContext _context;

    public AuditService(IApplicationDbContext _context)
    {
        this._context = _context;
    }

    public async Task<AuditEventDto> RecordEventAsync(CreateAuditEventDto dto, Guid? currentUserId)
    {
        var auditEvent = new AuditEvent
        {
            WorkflowInstanceId = dto.WorkflowInstanceId,
            UserId = currentUserId,
            EventType = dto.EventType,
            Description = dto.Description,
            MetadataJson = dto.MetadataJson,
            CorrelationId = dto.CorrelationId ?? Guid.NewGuid().ToString("N")
        };

        _context.AuditEvents.Add(auditEvent);
        await _context.SaveChangesAsync();

        var user = currentUserId.HasValue ? await _context.Users.FindAsync(currentUserId.Value) : null;

        return new AuditEventDto
        {
            Id = auditEvent.Id,
            WorkflowInstanceId = auditEvent.WorkflowInstanceId,
            UserId = auditEvent.UserId,
            UserName = user != null ? user.FullName : "System",
            EventType = auditEvent.EventType,
            EventTypeName = auditEvent.EventType.ToString(),
            Description = auditEvent.Description,
            MetadataJson = auditEvent.MetadataJson,
            CorrelationId = auditEvent.CorrelationId,
            CreatedAtUtc = auditEvent.CreatedAtUtc
        };
    }

    public async Task<PagedResponse<AuditEventDto>> GetAuditEventsAsync(AuditFilterParametersDto parameters, Guid currentUserId, string currentUserRole)
    {
        var query = _context.AuditEvents
            .Include(a => a.User)
            .AsQueryable();

        if (parameters.WorkflowInstanceId.HasValue)
            query = query.Where(a => a.WorkflowInstanceId == parameters.WorkflowInstanceId.Value);

        if (parameters.UserId.HasValue)
            query = query.Where(a => a.UserId == parameters.UserId.Value);

        if (parameters.EventType.HasValue)
            query = query.Where(a => a.EventType == parameters.EventType.Value);

        if (parameters.FromDateUtc.HasValue)
            query = query.Where(a => a.CreatedAtUtc >= parameters.FromDateUtc.Value);

        if (parameters.ToDateUtc.HasValue)
            query = query.Where(a => a.CreatedAtUtc <= parameters.ToDateUtc.Value);

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(a => a.CreatedAtUtc)
            .Skip((parameters.PageNumber - 1) * parameters.PageSize)
            .Take(parameters.PageSize)
            .Select(a => new AuditEventDto
            {
                Id = a.Id,
                WorkflowInstanceId = a.WorkflowInstanceId,
                UserId = a.UserId,
                UserName = a.User != null ? a.User.FullName : "System",
                EventType = a.EventType,
                EventTypeName = a.EventType.ToString(),
                Description = a.Description,
                MetadataJson = a.MetadataJson,
                CorrelationId = a.CorrelationId,
                CreatedAtUtc = a.CreatedAtUtc
            })
            .ToListAsync();

        return new PagedResponse<AuditEventDto>(items, totalCount, parameters.PageNumber, parameters.PageSize);
    }

    public async Task<List<AuditEventDto>> GetWorkflowAuditEventsAsync(Guid workflowId, Guid currentUserId, string currentUserRole)
    {
        return await _context.AuditEvents
            .Include(a => a.User)
            .Where(a => a.WorkflowInstanceId == workflowId)
            .OrderBy(a => a.CreatedAtUtc)
            .Select(a => new AuditEventDto
            {
                Id = a.Id,
                WorkflowInstanceId = a.WorkflowInstanceId,
                UserId = a.UserId,
                UserName = a.User != null ? a.User.FullName : "System",
                EventType = a.EventType,
                EventTypeName = a.EventType.ToString(),
                Description = a.Description,
                MetadataJson = a.MetadataJson,
                CorrelationId = a.CorrelationId,
                CreatedAtUtc = a.CreatedAtUtc
            })
            .ToListAsync();
    }
}
