using AssetBridge.Application.Common.Interfaces;
using AssetBridge.Application.Common.Models;
using AssetBridge.Application.DTOs.Workflow;
using AssetBridge.Application.Services.Interfaces;
using AssetBridge.Domain.Entities.Workflow;
using AssetBridge.Domain.Enums;
using AssetBridge.Domain.Exceptions;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace AssetBridge.Application.Services.Implementations;

// Implements long-term property continuity through post-maintenance follow-up scheduling and monitoring.
public class FollowUpService : IFollowUpService
{
    private readonly IApplicationDbContext _context;

    public FollowUpService(IApplicationDbContext _context)
    {
        this._context = _context;
    }

    public async Task<FollowUpTaskDto> CreateFollowUpTaskAsync(CreateFollowUpTaskDto dto, Guid currentUserId, string currentUserRole)
    {
        var asset = await _context.Assets.FirstOrDefaultAsync(a => a.Id == dto.AssetId);
        if (asset == null)
            throw new EntityNotFoundException("Asset", dto.AssetId);

        var task = new FollowUpTask
        {
            WorkflowInstanceId = dto.WorkflowInstanceId,
            AssetId = dto.AssetId,
            Title = dto.Title,
            Description = dto.Description,
            DueDateUtc = dto.DueDateUtc,
            Priority = dto.Priority,
            Status = FollowUpStatus.Pending,
            AssignedToUserId = dto.AssignedToUserId
        };

        var auditEvent = new AuditEvent
        {
            WorkflowInstanceId = dto.WorkflowInstanceId,
            UserId = currentUserId,
            EventType = AuditEventType.FollowUpCreated,
            Description = $"Follow-up task created: '{dto.Title}' for Asset: {asset.Name} (Due: {dto.DueDateUtc:yyyy-MM-dd})",
            CorrelationId = Guid.NewGuid().ToString("N"),
            MetadataJson = JsonSerializer.Serialize(new { dto.AssetId, dto.Title, DueDate = dto.DueDateUtc })
        };

        _context.FollowUpTasks.Add(task);
        _context.AuditEvents.Add(auditEvent);
        await _context.SaveChangesAsync();

        var assignedUser = dto.AssignedToUserId.HasValue ? await _context.Users.FindAsync(dto.AssignedToUserId.Value) : null;

        return new FollowUpTaskDto
        {
            Id = task.Id,
            WorkflowInstanceId = task.WorkflowInstanceId,
            AssetId = task.AssetId,
            AssetName = asset.Name,
            Title = task.Title,
            Description = task.Description,
            DueDateUtc = task.DueDateUtc,
            Status = task.Status,
            StatusName = task.Status.ToString(),
            Priority = task.Priority,
            PriorityName = task.Priority.ToString(),
            CreatedAtUtc = task.CreatedAtUtc,
            AssignedToUserId = task.AssignedToUserId,
            AssignedToUserName = assignedUser != null ? assignedUser.FullName : null
        };
    }

    public async Task<FollowUpTaskDto?> GetFollowUpTaskByIdAsync(Guid id, Guid currentUserId, string currentUserRole)
    {
        var task = await _context.FollowUpTasks
            .Include(f => f.Asset)
            .Include(f => f.AssignedToUser)
            .FirstOrDefaultAsync(f => f.Id == id);

        if (task == null)
            return null;

        return MapToDto(task);
    }

    public async Task<PagedResponse<FollowUpTaskDto>> GetFollowUpTasksAsync(FollowUpFilterParametersDto parameters, Guid currentUserId, string currentUserRole)
    {
        var query = _context.FollowUpTasks
            .Include(f => f.Asset)
            .Include(f => f.AssignedToUser)
            .AsQueryable();

        if (currentUserRole == UserRole.Owner.ToString())
            query = query.Where(f => f.Asset.OwnerId == currentUserId);
        else if (currentUserRole == UserRole.Representative.ToString())
            query = query.Where(f => f.AssignedToUserId == currentUserId);

        if (parameters.AssetId.HasValue)
            query = query.Where(f => f.AssetId == parameters.AssetId.Value);

        if (parameters.WorkflowInstanceId.HasValue)
            query = query.Where(f => f.WorkflowInstanceId == parameters.WorkflowInstanceId.Value);

        if (parameters.Status.HasValue)
            query = query.Where(f => f.Status == parameters.Status.Value);

        if (parameters.Priority.HasValue)
            query = query.Where(f => f.Priority == parameters.Priority.Value);

        if (parameters.IsOverdue.HasValue && parameters.IsOverdue.Value)
        {
            var now = DateTime.UtcNow;
            query = query.Where(f => f.Status != FollowUpStatus.Completed && f.Status != FollowUpStatus.Cancelled && f.DueDateUtc < now);
        }

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderBy(f => f.DueDateUtc)
            .Skip((parameters.PageNumber - 1) * parameters.PageSize)
            .Take(parameters.PageSize)
            .Select(f => new FollowUpTaskDto
            {
                Id = f.Id,
                WorkflowInstanceId = f.WorkflowInstanceId,
                AssetId = f.AssetId,
                AssetName = f.Asset.Name,
                Title = f.Title,
                Description = f.Description,
                DueDateUtc = f.DueDateUtc,
                Status = f.Status,
                StatusName = f.Status.ToString(),
                Priority = f.Priority,
                PriorityName = f.Priority.ToString(),
                CreatedAtUtc = f.CreatedAtUtc,
                CompletedAtUtc = f.CompletedAtUtc,
                AssignedToUserId = f.AssignedToUserId,
                AssignedToUserName = f.AssignedToUser != null ? f.AssignedToUser.FullName : null
            })
            .ToListAsync();

        return new PagedResponse<FollowUpTaskDto>(items, totalCount, parameters.PageNumber, parameters.PageSize);
    }

    public async Task<List<FollowUpTaskDto>> GetWorkflowFollowUpsAsync(Guid workflowId, Guid currentUserId, string currentUserRole)
    {
        return await _context.FollowUpTasks
            .Include(f => f.Asset)
            .Include(f => f.AssignedToUser)
            .Where(f => f.WorkflowInstanceId == workflowId)
            .OrderBy(f => f.DueDateUtc)
            .Select(f => new FollowUpTaskDto
            {
                Id = f.Id,
                WorkflowInstanceId = f.WorkflowInstanceId,
                AssetId = f.AssetId,
                AssetName = f.Asset.Name,
                Title = f.Title,
                Description = f.Description,
                DueDateUtc = f.DueDateUtc,
                Status = f.Status,
                StatusName = f.Status.ToString(),
                Priority = f.Priority,
                PriorityName = f.Priority.ToString(),
                CreatedAtUtc = f.CreatedAtUtc,
                CompletedAtUtc = f.CompletedAtUtc,
                AssignedToUserId = f.AssignedToUserId,
                AssignedToUserName = f.AssignedToUser != null ? f.AssignedToUser.FullName : null
            })
            .ToListAsync();
    }

    public async Task<FollowUpTaskDto> UpdateFollowUpStatusAsync(Guid id, UpdateFollowUpStatusDto dto, Guid currentUserId, string currentUserRole)
    {
        var task = await _context.FollowUpTasks
            .Include(f => f.Asset)
            .Include(f => f.AssignedToUser)
            .FirstOrDefaultAsync(f => f.Id == id);

        if (task == null)
            throw new EntityNotFoundException("FollowUpTask", id);

        task.Status = dto.Status;
        if (dto.Status == FollowUpStatus.Completed)
            task.CompletedAtUtc = DateTime.UtcNow;

        if (!string.IsNullOrWhiteSpace(dto.ResolutionNotes))
            task.Description += $"\n[Resolution: {dto.ResolutionNotes}]";

        await _context.SaveChangesAsync();

        return MapToDto(task);
    }

    private static FollowUpTaskDto MapToDto(FollowUpTask task)
    {
        return new FollowUpTaskDto
        {
            Id = task.Id,
            WorkflowInstanceId = task.WorkflowInstanceId,
            AssetId = task.AssetId,
            AssetName = task.Asset.Name,
            Title = task.Title,
            Description = task.Description,
            DueDateUtc = task.DueDateUtc,
            Status = task.Status,
            StatusName = task.Status.ToString(),
            Priority = task.Priority,
            PriorityName = task.Priority.ToString(),
            CreatedAtUtc = task.CreatedAtUtc,
            CompletedAtUtc = task.CompletedAtUtc,
            AssignedToUserId = task.AssignedToUserId,
            AssignedToUserName = task.AssignedToUser != null ? task.AssignedToUser.FullName : null
        };
    }
}
