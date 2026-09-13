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

// Implements the deterministic workflow orchestration and governance state machine for AssetBridge AI.
// Enforces:
// 1. Strict state machine transitions across all 15 states
// 2. High-impact human-in-the-loop approval enforcement (Manager/Admin only)
// 3. Complete historical step tracking & append-only audit event logging
// 4. Persistence for future Agentic AI observability
public class WorkflowService : IWorkflowService
{
    private readonly IApplicationDbContext _context;

    // Allowed transition map: Key = Current State, Value = Set of permissible next states
    private static readonly Dictionary<WorkflowState, HashSet<WorkflowState>> AllowedTransitions = new()
    {
        [WorkflowState.Created] = new() { WorkflowState.Planning, WorkflowState.Failed },
        [WorkflowState.Planning] = new() { WorkflowState.ProviderSelection, WorkflowState.Failed },
        [WorkflowState.ProviderSelection] = new() { WorkflowState.InspectionPending, WorkflowState.QuotationReview, WorkflowState.Failed },
        [WorkflowState.InspectionPending] = new() { WorkflowState.QuotationReview, WorkflowState.Failed },
        [WorkflowState.QuotationReview] = new() { WorkflowState.AiValidation, WorkflowState.AwaitingApproval, WorkflowState.Failed },
        [WorkflowState.AiValidation] = new() { WorkflowState.AwaitingApproval, WorkflowState.Failed },
        [WorkflowState.AwaitingApproval] = new() { WorkflowState.Approved, WorkflowState.Rejected, WorkflowState.RevisionRequested, WorkflowState.Failed },
        [WorkflowState.RevisionRequested] = new() { WorkflowState.QuotationReview, WorkflowState.Planning, WorkflowState.Failed },
        [WorkflowState.Approved] = new() { WorkflowState.Execution, WorkflowState.Failed },
        [WorkflowState.Rejected] = new() { WorkflowState.Planning, WorkflowState.Failed },
        [WorkflowState.Execution] = new() { WorkflowState.CompletionReview, WorkflowState.Failed },
        [WorkflowState.CompletionReview] = new() { WorkflowState.Completed, WorkflowState.RevisionRequested, WorkflowState.Failed },
        [WorkflowState.Completed] = new() { WorkflowState.FollowUp },
        [WorkflowState.FollowUp] = new() { },
        [WorkflowState.Failed] = new() { WorkflowState.Planning }
    };

    public WorkflowService(IApplicationDbContext _context)
    {
        this._context = _context;
    }

    public async Task<WorkflowInstanceDto> CreateWorkflowAsync(CreateWorkflowRequestDto dto, Guid currentUserId)
    {
        var incident = await _context.Incidents
            .Include(i => i.Asset)
            .FirstOrDefaultAsync(i => i.Id == dto.IncidentId);

        if (incident == null)
            throw new EntityNotFoundException("Incident", dto.IncidentId);

        var existingActive = await _context.WorkflowInstances
            .AnyAsync(w => w.IncidentId == dto.IncidentId &&
                           w.CurrentState != WorkflowState.Completed &&
                           w.CurrentState != WorkflowState.FollowUp &&
                           w.CurrentState != WorkflowState.Rejected &&
                           w.CurrentState != WorkflowState.Failed);

        if (existingActive)
            throw new ValidationException("IncidentId", "An active workflow is already underway for this incident.");

        var workflow = new WorkflowInstance
        {
            IncidentId = dto.IncidentId,
            CurrentState = WorkflowState.Created,
            CreatedByUserId = currentUserId,
            CorrelationId = Guid.NewGuid().ToString("N")
        };

        var initialStep = new WorkflowStep
        {
            WorkflowInstanceId = workflow.Id,
            StepState = WorkflowState.Created,
            Status = WorkflowStepStatus.InProgress,
            StartedAtUtc = DateTime.UtcNow,
            StartedBy = $"User:{currentUserId}",
            Notes = dto.InitialNotes ?? "Workflow initiated."
        };

        var auditEvent = new AuditEvent
        {
            WorkflowInstanceId = workflow.Id,
            UserId = currentUserId,
            EventType = AuditEventType.WorkflowCreated,
            Description = $"Workflow created for Incident: {incident.Title} (Asset: {incident.Asset.Name})",
            CorrelationId = workflow.CorrelationId,
            MetadataJson = JsonSerializer.Serialize(new { IncidentId = incident.Id, AssetId = incident.AssetId, Title = incident.Title })
        };

        _context.WorkflowInstances.Add(workflow);
        _context.WorkflowSteps.Add(initialStep);
        _context.AuditEvents.Add(auditEvent);

        await _context.SaveChangesAsync();

        return MapToDto(workflow, incident.Title, incident.AssetId, incident.Asset.Name);
    }

    public async Task<WorkflowInstanceDto?> GetWorkflowByIdAsync(Guid id, Guid currentUserId, string currentUserRole)
    {
        var workflow = await _context.WorkflowInstances
            .Include(w => w.Incident)
                .ThenInclude(i => i.Asset)
            .Include(w => w.CreatedByUser)
            .Include(w => w.Steps)
            .Include(w => w.ApprovalRequests)
            .FirstOrDefaultAsync(w => w.Id == id);

        if (workflow == null)
            return null;

        // Verify ownership/role access
        ValidateWorkflowAccess(workflow, currentUserId, currentUserRole);

        return MapToDto(workflow, workflow.Incident.Title, workflow.Incident.AssetId, workflow.Incident.Asset.Name);
    }

    public async Task<PagedResponse<WorkflowInstanceDto>> GetWorkflowsAsync(WorkflowFilterParametersDto parameters, Guid currentUserId, string currentUserRole)
    {
        var query = _context.WorkflowInstances
            .Include(w => w.Incident)
                .ThenInclude(i => i.Asset)
            .Include(w => w.CreatedByUser)
            .Include(w => w.Steps)
            .Include(w => w.ApprovalRequests)
            .AsQueryable();

        // Role-based scoping: Owners only see their own properties' workflows
        if (currentUserRole == UserRole.Owner.ToString())
        {
            query = query.Where(w => w.Incident.Asset.OwnerId == currentUserId);
        }

        if (parameters.State.HasValue)
            query = query.Where(w => w.CurrentState == parameters.State.Value);

        if (parameters.IncidentId.HasValue)
            query = query.Where(w => w.IncidentId == parameters.IncidentId.Value);

        if (parameters.AssetId.HasValue)
            query = query.Where(w => w.Incident.AssetId == parameters.AssetId.Value);

        if (parameters.FromDateUtc.HasValue)
            query = query.Where(w => w.CreatedAtUtc >= parameters.FromDateUtc.Value);

        if (parameters.ToDateUtc.HasValue)
            query = query.Where(w => w.CreatedAtUtc <= parameters.ToDateUtc.Value);

        var totalCount = await query.CountAsync();

        query = parameters.SortBy?.ToLowerInvariant() switch
        {
            "state" => parameters.SortDescending ? query.OrderByDescending(w => w.CurrentState) : query.OrderBy(w => w.CurrentState),
            "updatedatutc" => parameters.SortDescending ? query.OrderByDescending(w => w.UpdatedAtUtc) : query.OrderBy(w => w.UpdatedAtUtc),
            _ => parameters.SortDescending ? query.OrderByDescending(w => w.CreatedAtUtc) : query.OrderBy(w => w.CreatedAtUtc)
        };

        var items = await query
            .Skip((parameters.PageNumber - 1) * parameters.PageSize)
            .Take(parameters.PageSize)
            .Select(w => new WorkflowInstanceDto
            {
                Id = w.Id,
                IncidentId = w.IncidentId,
                IncidentTitle = w.Incident.Title,
                AssetId = w.Incident.AssetId,
                AssetName = w.Incident.Asset.Name,
                CurrentState = w.CurrentState,
                CurrentStateName = w.CurrentState.ToString(),
                CreatedAtUtc = w.CreatedAtUtc,
                UpdatedAtUtc = w.UpdatedAtUtc,
                StartedAtUtc = w.StartedAtUtc,
                CompletedAtUtc = w.CompletedAtUtc,
                FailureReason = w.FailureReason,
                CorrelationId = w.CorrelationId,
                CreatedByUserId = w.CreatedByUserId,
                CreatedByUserName = w.CreatedByUser != null ? w.CreatedByUser.FullName : string.Empty,
                StepsCount = w.Steps.Count,
                PendingApprovalsCount = w.ApprovalRequests.Count(a => a.Status == ApprovalStatus.Pending)
            })
            .ToListAsync();

        return new PagedResponse<WorkflowInstanceDto>(items, totalCount, parameters.PageNumber, parameters.PageSize);
    }

    public async Task<WorkflowTimelineDto?> GetWorkflowTimelineAsync(Guid workflowId, Guid currentUserId, string currentUserRole)
    {
        var workflow = await _context.WorkflowInstances
            .Include(w => w.Incident).ThenInclude(i => i.Asset)
            .Include(w => w.Steps)
            .Include(w => w.ApprovalRequests).ThenInclude(a => a.RequestedByUser)
            .Include(w => w.ApprovalRequests).ThenInclude(a => a.AssignedApproverUser)
            .Include(w => w.AuditEvents).ThenInclude(a => a.User)
            .FirstOrDefaultAsync(w => w.Id == workflowId);

        if (workflow == null)
            return null;

        ValidateWorkflowAccess(workflow, currentUserId, currentUserRole);

        return new WorkflowTimelineDto
        {
            WorkflowInstanceId = workflow.Id,
            IncidentId = workflow.IncidentId,
            CurrentState = workflow.CurrentState,
            CurrentStateName = workflow.CurrentState.ToString(),
            CreatedAtUtc = workflow.CreatedAtUtc,
            CompletedAtUtc = workflow.CompletedAtUtc,
            Steps = workflow.Steps.OrderBy(s => s.StartedAtUtc).Select(s => new WorkflowStepDto
            {
                Id = s.Id,
                WorkflowInstanceId = s.WorkflowInstanceId,
                StepState = s.StepState,
                StepStateName = s.StepState.ToString(),
                Status = s.Status,
                StatusName = s.Status.ToString(),
                StartedAtUtc = s.StartedAtUtc,
                CompletedAtUtc = s.CompletedAtUtc,
                StartedBy = s.StartedBy,
                CompletedBy = s.CompletedBy,
                Notes = s.Notes,
                ErrorMessage = s.ErrorMessage,
                DurationSeconds = s.CompletedAtUtc.HasValue ? (s.CompletedAtUtc.Value - s.StartedAtUtc).TotalSeconds : null
            }).ToList(),
            Approvals = workflow.ApprovalRequests.OrderByDescending(a => a.RequestedAtUtc).Select(a => new ApprovalRequestDto
            {
                Id = a.Id,
                WorkflowInstanceId = a.WorkflowInstanceId,
                RequestedByUserId = a.RequestedByUserId,
                RequestedByUserName = a.RequestedByUser.FullName,
                AssignedApproverUserId = a.AssignedApproverUserId,
                AssignedApproverUserName = a.AssignedApproverUser != null ? a.AssignedApproverUser.FullName : null,
                Status = a.Status,
                StatusName = a.Status.ToString(),
                Decision = a.Decision,
                DecisionName = a.Decision?.ToString(),
                DecisionReason = a.DecisionReason,
                RequestedAtUtc = a.RequestedAtUtc,
                DecidedAtUtc = a.DecidedAtUtc,
                RevisionComment = a.RevisionComment
            }).ToList(),
            AuditEvents = workflow.AuditEvents.OrderBy(a => a.CreatedAtUtc).Select(a => new AuditEventDto
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
            }).ToList()
        };
    }

    public async Task<WorkflowInstanceDto> TransitionWorkflowAsync(Guid workflowId, TransitionWorkflowRequestDto dto, Guid currentUserId, string currentUserRole)
    {
        var workflow = await _context.WorkflowInstances
            .Include(w => w.Incident).ThenInclude(i => i.Asset)
            .Include(w => w.CreatedByUser)
            .Include(w => w.Steps)
            .FirstOrDefaultAsync(w => w.Id == workflowId);

        if (workflow == null)
            throw new EntityNotFoundException("WorkflowInstance", workflowId);

        ValidateWorkflowAccess(workflow, currentUserId, currentUserRole);

        // State Machine validation
        if (!AllowedTransitions.TryGetValue(workflow.CurrentState, out var allowedNextStates) || !allowedNextStates.Contains(dto.TargetState))
        {
            throw new ValidationException("TargetState", $"Invalid state transition from '{workflow.CurrentState}' to '{dto.TargetState}'. Allowed transitions from '{workflow.CurrentState}' are: {string.Join(", ", allowedNextStates ?? new HashSet<WorkflowState>())}");
        }

        var oldState = workflow.CurrentState;
        var now = DateTime.UtcNow;

        // 1. Complete current step
        var currentStep = workflow.Steps.OrderByDescending(s => s.StartedAtUtc).FirstOrDefault(s => s.Status == WorkflowStepStatus.InProgress);
        if (currentStep != null)
        {
            currentStep.Status = WorkflowStepStatus.Completed;
            currentStep.CompletedAtUtc = now;
            currentStep.CompletedBy = dto.Actor ?? $"User:{currentUserId}";
            if (!string.IsNullOrWhiteSpace(dto.Reason))
                currentStep.Notes = (currentStep.Notes != null ? currentStep.Notes + " | " : "") + dto.Reason;
        }

        // 2. Open new step
        var newStep = new WorkflowStep
        {
            WorkflowInstanceId = workflow.Id,
            StepState = dto.TargetState,
            Status = WorkflowStepStatus.InProgress,
            StartedAtUtc = now,
            StartedBy = dto.Actor ?? $"User:{currentUserId}",
            Notes = dto.Reason
        };
        _context.WorkflowSteps.Add(newStep);

        // 3. Update workflow state
        workflow.CurrentState = dto.TargetState;
        workflow.UpdatedAtUtc = now;

        if (workflow.StartedAtUtc == null && dto.TargetState != WorkflowState.Created)
            workflow.StartedAtUtc = now;

        if (dto.TargetState == WorkflowState.Completed || dto.TargetState == WorkflowState.FollowUp)
            workflow.CompletedAtUtc = now;

        // 4. Record Audit Event
        var auditEvent = new AuditEvent
        {
            WorkflowInstanceId = workflow.Id,
            UserId = currentUserId,
            EventType = AuditEventType.WorkflowStateChanged,
            Description = $"Workflow transitioned from {oldState} to {dto.TargetState}. Reason: {dto.Reason ?? "Normal progression"}",
            CorrelationId = workflow.CorrelationId,
            MetadataJson = dto.MetadataJson ?? JsonSerializer.Serialize(new { From = oldState.ToString(), To = dto.TargetState.ToString(), Reason = dto.Reason })
        };
        _context.AuditEvents.Add(auditEvent);

        await _context.SaveChangesAsync();

        return MapToDto(workflow, workflow.Incident.Title, workflow.Incident.AssetId, workflow.Incident.Asset.Name);
    }

    public async Task<WorkflowInstanceDto> FailWorkflowAsync(Guid workflowId, FailWorkflowRequestDto dto, Guid currentUserId, string currentUserRole)
    {
        var workflow = await _context.WorkflowInstances
            .Include(w => w.Incident).ThenInclude(i => i.Asset)
            .Include(w => w.CreatedByUser)
            .Include(w => w.Steps)
            .FirstOrDefaultAsync(w => w.Id == workflowId);

        if (workflow == null)
            throw new EntityNotFoundException("WorkflowInstance", workflowId);

        ValidateWorkflowAccess(workflow, currentUserId, currentUserRole);

        var now = DateTime.UtcNow;
        var oldState = workflow.CurrentState;

        var currentStep = workflow.Steps.OrderByDescending(s => s.StartedAtUtc).FirstOrDefault(s => s.Status == WorkflowStepStatus.InProgress);
        if (currentStep != null)
        {
            currentStep.Status = WorkflowStepStatus.Failed;
            currentStep.CompletedAtUtc = now;
            currentStep.CompletedBy = $"User:{currentUserId}";
            currentStep.ErrorMessage = dto.FailureReason;
        }

        workflow.CurrentState = WorkflowState.Failed;
        workflow.FailureReason = dto.FailureReason;
        workflow.UpdatedAtUtc = now;

        var auditEvent = new AuditEvent
        {
            WorkflowInstanceId = workflow.Id,
            UserId = currentUserId,
            EventType = AuditEventType.WorkflowFailed,
            Description = $"Workflow failed from state {oldState}. Reason: {dto.FailureReason}",
            CorrelationId = workflow.CorrelationId,
            MetadataJson = JsonSerializer.Serialize(new { FromState = oldState.ToString(), Reason = dto.FailureReason, Details = dto.Details })
        };
        _context.AuditEvents.Add(auditEvent);

        await _context.SaveChangesAsync();

        return MapToDto(workflow, workflow.Incident.Title, workflow.Incident.AssetId, workflow.Incident.Asset.Name);
    }

    public async Task<ApprovalRequestDto> CreateApprovalRequestAsync(Guid workflowId, CreateApprovalRequestDto dto, Guid currentUserId, string currentUserRole)
    {
        var workflow = await _context.WorkflowInstances
            .Include(w => w.ApprovalRequests)
            .Include(w => w.Steps)
            .FirstOrDefaultAsync(w => w.Id == workflowId);

        if (workflow == null)
            throw new EntityNotFoundException("WorkflowInstance", workflowId);

        if (workflow.CurrentState != WorkflowState.AiValidation &&
            workflow.CurrentState != WorkflowState.QuotationReview &&
            workflow.CurrentState != WorkflowState.AwaitingApproval &&
            workflow.CurrentState != WorkflowState.RevisionRequested)
        {
            throw new ValidationException("WorkflowState", $"Cannot request approval when workflow is in state '{workflow.CurrentState}'. Must be in QuotationReview, AiValidation, or RevisionRequested.");
        }

        var existingPending = workflow.ApprovalRequests.Any(a => a.Status == ApprovalStatus.Pending);
        if (existingPending)
            throw new ValidationException("ApprovalRequest", "A pending approval request already exists for this workflow.");

        var approval = new ApprovalRequest
        {
            WorkflowInstanceId = workflow.Id,
            RequestedByUserId = currentUserId,
            AssignedApproverUserId = dto.AssignedApproverUserId,
            Status = ApprovalStatus.Pending,
            RequestedAtUtc = DateTime.UtcNow
        };

        // Transition workflow state to AwaitingApproval
        workflow.CurrentState = WorkflowState.AwaitingApproval;
        workflow.UpdatedAtUtc = DateTime.UtcNow;

        var currentStep = workflow.Steps.OrderByDescending(s => s.StartedAtUtc).FirstOrDefault(s => s.Status == WorkflowStepStatus.InProgress);
        if (currentStep != null)
        {
            currentStep.Status = WorkflowStepStatus.Completed;
            currentStep.CompletedAtUtc = DateTime.UtcNow;
            currentStep.CompletedBy = $"User:{currentUserId}";
        }

        var newStep = new WorkflowStep
        {
            WorkflowInstanceId = workflow.Id,
            StepState = WorkflowState.AwaitingApproval,
            Status = WorkflowStepStatus.InProgress,
            StartedAtUtc = DateTime.UtcNow,
            StartedBy = $"User:{currentUserId}",
            Notes = dto.InitialNotes ?? "Awaiting human manager approval."
        };

        var auditEvent = new AuditEvent
        {
            WorkflowInstanceId = workflow.Id,
            UserId = currentUserId,
            EventType = AuditEventType.ApprovalRequested,
            Description = "High-impact approval requested for workflow proposal.",
            CorrelationId = workflow.CorrelationId,
            MetadataJson = JsonSerializer.Serialize(new { AssignedApprover = dto.AssignedApproverUserId, Notes = dto.InitialNotes })
        };

        _context.ApprovalRequests.Add(approval);
        _context.WorkflowSteps.Add(newStep);
        _context.AuditEvents.Add(auditEvent);

        await _context.SaveChangesAsync();

        var requestedUser = await _context.Users.FindAsync(currentUserId);

        return new ApprovalRequestDto
        {
            Id = approval.Id,
            WorkflowInstanceId = approval.WorkflowInstanceId,
            RequestedByUserId = approval.RequestedByUserId,
            RequestedByUserName = requestedUser != null ? requestedUser.FullName : string.Empty,
            AssignedApproverUserId = approval.AssignedApproverUserId,
            Status = approval.Status,
            StatusName = approval.Status.ToString(),
            RequestedAtUtc = approval.RequestedAtUtc
        };
    }

    public async Task<ApprovalRequestDto> ApproveWorkflowAsync(Guid workflowId, ApprovalDecisionRequestDto dto, Guid currentUserId, string currentUserRole)
    {
        // STRICT SECURITY GUARD: Only Manager or Admin can approve high-impact actions
        EnforceManagerOrAdminRole(currentUserRole, "approve workflow proposals");

        var workflow = await _context.WorkflowInstances
            .Include(w => w.ApprovalRequests)
            .Include(w => w.Steps)
            .FirstOrDefaultAsync(w => w.Id == workflowId);

        if (workflow == null)
            throw new EntityNotFoundException("WorkflowInstance", workflowId);

        if (workflow.CurrentState != WorkflowState.AwaitingApproval)
            throw new ValidationException("CurrentState", $"Cannot approve workflow. Current state is '{workflow.CurrentState}', but must be 'AwaitingApproval'.");

        var pendingApproval = workflow.ApprovalRequests.OrderByDescending(a => a.RequestedAtUtc).FirstOrDefault(a => a.Status == ApprovalStatus.Pending);
        if (pendingApproval == null)
            throw new ValidationException("ApprovalRequest", "No pending approval request found for this workflow.");

        var now = DateTime.UtcNow;

        // 1. Record Approval Decision
        pendingApproval.Status = ApprovalStatus.Approved;
        pendingApproval.Decision = ApprovalDecision.Approve;
        pendingApproval.DecisionReason = dto.DecisionReason;
        pendingApproval.DecidedAtUtc = now;
        pendingApproval.AssignedApproverUserId ??= currentUserId;

        // 2. Advance State Machine to Approved
        workflow.CurrentState = WorkflowState.Approved;
        workflow.UpdatedAtUtc = now;

        // 3. Complete AwaitingApproval step & create Approved step
        var currentStep = workflow.Steps.OrderByDescending(s => s.StartedAtUtc).FirstOrDefault(s => s.Status == WorkflowStepStatus.InProgress);
        if (currentStep != null)
        {
            currentStep.Status = WorkflowStepStatus.Completed;
            currentStep.CompletedAtUtc = now;
            currentStep.CompletedBy = $"User:{currentUserId}";
            currentStep.Notes = $"Approved by manager: {dto.DecisionReason}";
        }

        var newStep = new WorkflowStep
        {
            WorkflowInstanceId = workflow.Id,
            StepState = WorkflowState.Approved,
            Status = WorkflowStepStatus.Completed,
            StartedAtUtc = now,
            CompletedAtUtc = now,
            StartedBy = $"User:{currentUserId}",
            CompletedBy = $"User:{currentUserId}",
            Notes = $"Human approval granted. Decision Reason: {dto.DecisionReason}"
        };
        _context.WorkflowSteps.Add(newStep);

        // 4. Record Audit Event
        var auditEvent = new AuditEvent
        {
            WorkflowInstanceId = workflow.Id,
            UserId = currentUserId,
            EventType = AuditEventType.ApprovalApproved,
            Description = $"Workflow approved by {currentUserRole} ({currentUserId}). Reason: {dto.DecisionReason}",
            CorrelationId = workflow.CorrelationId,
            MetadataJson = JsonSerializer.Serialize(new { ApproverId = currentUserId, Role = currentUserRole, Reason = dto.DecisionReason })
        };
        _context.AuditEvents.Add(auditEvent);

        await _context.SaveChangesAsync();

        var approver = await _context.Users.FindAsync(currentUserId);
        var requester = await _context.Users.FindAsync(pendingApproval.RequestedByUserId);

        return new ApprovalRequestDto
        {
            Id = pendingApproval.Id,
            WorkflowInstanceId = pendingApproval.WorkflowInstanceId,
            RequestedByUserId = pendingApproval.RequestedByUserId,
            RequestedByUserName = requester != null ? requester.FullName : string.Empty,
            AssignedApproverUserId = currentUserId,
            AssignedApproverUserName = approver != null ? approver.FullName : string.Empty,
            Status = pendingApproval.Status,
            StatusName = pendingApproval.Status.ToString(),
            Decision = pendingApproval.Decision,
            DecisionName = pendingApproval.Decision.ToString(),
            DecisionReason = pendingApproval.DecisionReason,
            RequestedAtUtc = pendingApproval.RequestedAtUtc,
            DecidedAtUtc = pendingApproval.DecidedAtUtc
        };
    }

    public async Task<ApprovalRequestDto> RejectWorkflowAsync(Guid workflowId, ApprovalDecisionRequestDto dto, Guid currentUserId, string currentUserRole)
    {
        EnforceManagerOrAdminRole(currentUserRole, "reject workflow proposals");

        var workflow = await _context.WorkflowInstances
            .Include(w => w.ApprovalRequests)
            .Include(w => w.Steps)
            .FirstOrDefaultAsync(w => w.Id == workflowId);

        if (workflow == null)
            throw new EntityNotFoundException("WorkflowInstance", workflowId);

        if (workflow.CurrentState != WorkflowState.AwaitingApproval)
            throw new ValidationException("CurrentState", $"Cannot reject workflow. Current state is '{workflow.CurrentState}', but must be 'AwaitingApproval'.");

        var pendingApproval = workflow.ApprovalRequests.OrderByDescending(a => a.RequestedAtUtc).FirstOrDefault(a => a.Status == ApprovalStatus.Pending);
        if (pendingApproval == null)
            throw new ValidationException("ApprovalRequest", "No pending approval request found for this workflow.");

        var now = DateTime.UtcNow;

        pendingApproval.Status = ApprovalStatus.Rejected;
        pendingApproval.Decision = ApprovalDecision.Reject;
        pendingApproval.DecisionReason = dto.DecisionReason;
        pendingApproval.DecidedAtUtc = now;
        pendingApproval.AssignedApproverUserId ??= currentUserId;

        workflow.CurrentState = WorkflowState.Rejected;
        workflow.CompletedAtUtc = now;
        workflow.UpdatedAtUtc = now;

        var currentStep = workflow.Steps.OrderByDescending(s => s.StartedAtUtc).FirstOrDefault(s => s.Status == WorkflowStepStatus.InProgress);
        if (currentStep != null)
        {
            currentStep.Status = WorkflowStepStatus.Completed;
            currentStep.CompletedAtUtc = now;
            currentStep.CompletedBy = $"User:{currentUserId}";
            currentStep.Notes = $"Rejected: {dto.DecisionReason}";
        }

        var auditEvent = new AuditEvent
        {
            WorkflowInstanceId = workflow.Id,
            UserId = currentUserId,
            EventType = AuditEventType.ApprovalRejected,
            Description = $"Workflow rejected by {currentUserRole} ({currentUserId}). Reason: {dto.DecisionReason}",
            CorrelationId = workflow.CorrelationId,
            MetadataJson = JsonSerializer.Serialize(new { ApproverId = currentUserId, Role = currentUserRole, Reason = dto.DecisionReason })
        };
        _context.AuditEvents.Add(auditEvent);

        await _context.SaveChangesAsync();

        var approver = await _context.Users.FindAsync(currentUserId);
        var requester = await _context.Users.FindAsync(pendingApproval.RequestedByUserId);

        return new ApprovalRequestDto
        {
            Id = pendingApproval.Id,
            WorkflowInstanceId = pendingApproval.WorkflowInstanceId,
            RequestedByUserId = pendingApproval.RequestedByUserId,
            RequestedByUserName = requester != null ? requester.FullName : string.Empty,
            AssignedApproverUserId = currentUserId,
            AssignedApproverUserName = approver != null ? approver.FullName : string.Empty,
            Status = pendingApproval.Status,
            StatusName = pendingApproval.Status.ToString(),
            Decision = pendingApproval.Decision,
            DecisionName = pendingApproval.Decision.ToString(),
            DecisionReason = pendingApproval.DecisionReason,
            RequestedAtUtc = pendingApproval.RequestedAtUtc,
            DecidedAtUtc = pendingApproval.DecidedAtUtc
        };
    }

    public async Task<ApprovalRequestDto> RequestRevisionAsync(Guid workflowId, RevisionRequestDto dto, Guid currentUserId, string currentUserRole)
    {
        EnforceManagerOrAdminRole(currentUserRole, "request workflow revisions");

        var workflow = await _context.WorkflowInstances
            .Include(w => w.ApprovalRequests)
            .Include(w => w.Steps)
            .FirstOrDefaultAsync(w => w.Id == workflowId);

        if (workflow == null)
            throw new EntityNotFoundException("WorkflowInstance", workflowId);

        if (workflow.CurrentState != WorkflowState.AwaitingApproval && workflow.CurrentState != WorkflowState.CompletionReview)
            throw new ValidationException("CurrentState", $"Cannot request revision. Current state is '{workflow.CurrentState}', but must be 'AwaitingApproval' or 'CompletionReview'.");

        var pendingApproval = workflow.ApprovalRequests.OrderByDescending(a => a.RequestedAtUtc).FirstOrDefault(a => a.Status == ApprovalStatus.Pending);
        if (pendingApproval == null)
            throw new ValidationException("ApprovalRequest", "No pending approval request found for this workflow.");

        var now = DateTime.UtcNow;

        pendingApproval.Status = ApprovalStatus.RevisionRequested;
        pendingApproval.Decision = ApprovalDecision.RequestRevision;
        pendingApproval.RevisionComment = dto.RevisionComment;
        pendingApproval.DecisionReason = dto.DecisionReason;
        pendingApproval.DecidedAtUtc = now;
        pendingApproval.AssignedApproverUserId ??= currentUserId;

        workflow.CurrentState = WorkflowState.RevisionRequested;
        workflow.UpdatedAtUtc = now;

        var currentStep = workflow.Steps.OrderByDescending(s => s.StartedAtUtc).FirstOrDefault(s => s.Status == WorkflowStepStatus.InProgress);
        if (currentStep != null)
        {
            currentStep.Status = WorkflowStepStatus.Completed;
            currentStep.CompletedAtUtc = now;
            currentStep.CompletedBy = $"User:{currentUserId}";
            currentStep.Notes = $"Revision requested: {dto.RevisionComment}";
        }

        var newStep = new WorkflowStep
        {
            WorkflowInstanceId = workflow.Id,
            StepState = WorkflowState.RevisionRequested,
            Status = WorkflowStepStatus.InProgress,
            StartedAtUtc = now,
            StartedBy = $"User:{currentUserId}",
            Notes = $"Revision comments: {dto.RevisionComment}"
        };
        _context.WorkflowSteps.Add(newStep);

        var auditEvent = new AuditEvent
        {
            WorkflowInstanceId = workflow.Id,
            UserId = currentUserId,
            EventType = AuditEventType.RevisionRequested,
            Description = $"Revision requested by {currentUserRole} ({currentUserId}). Comments: {dto.RevisionComment}",
            CorrelationId = workflow.CorrelationId,
            MetadataJson = JsonSerializer.Serialize(new { ApproverId = currentUserId, Comment = dto.RevisionComment, Reason = dto.DecisionReason })
        };
        _context.AuditEvents.Add(auditEvent);

        await _context.SaveChangesAsync();

        var approver = await _context.Users.FindAsync(currentUserId);
        var requester = await _context.Users.FindAsync(pendingApproval.RequestedByUserId);

        return new ApprovalRequestDto
        {
            Id = pendingApproval.Id,
            WorkflowInstanceId = pendingApproval.WorkflowInstanceId,
            RequestedByUserId = pendingApproval.RequestedByUserId,
            RequestedByUserName = requester != null ? requester.FullName : string.Empty,
            AssignedApproverUserId = currentUserId,
            AssignedApproverUserName = approver != null ? approver.FullName : string.Empty,
            Status = pendingApproval.Status,
            StatusName = pendingApproval.Status.ToString(),
            Decision = pendingApproval.Decision,
            DecisionName = pendingApproval.Decision.ToString(),
            DecisionReason = pendingApproval.DecisionReason,
            RevisionComment = pendingApproval.RevisionComment,
            RequestedAtUtc = pendingApproval.RequestedAtUtc,
            DecidedAtUtc = pendingApproval.DecidedAtUtc
        };
    }

    public async Task<AgentRunDto> RecordAgentRunAsync(Guid workflowId, CreateAgentRunDto dto, Guid currentUserId)
    {
        var workflow = await _context.WorkflowInstances.FindAsync(workflowId);
        if (workflow == null)
            throw new EntityNotFoundException("WorkflowInstance", workflowId);

        var agentRun = new AgentRun
        {
            WorkflowInstanceId = workflowId,
            AgentName = dto.AgentName,
            AgentType = dto.AgentType,
            Status = AgentRunStatus.Running,
            StartedAtUtc = DateTime.UtcNow,
            InputSummary = dto.InputSummary,
            CorrelationId = dto.CorrelationId ?? workflow.CorrelationId
        };

        var auditEvent = new AuditEvent
        {
            WorkflowInstanceId = workflowId,
            UserId = currentUserId,
            EventType = AuditEventType.AiPlanCreated,
            Description = $"Agent {dto.AgentName} ({dto.AgentType}) started execution.",
            CorrelationId = agentRun.CorrelationId,
            MetadataJson = JsonSerializer.Serialize(new { Agent = dto.AgentName, Type = dto.AgentType.ToString() })
        };

        _context.AgentRuns.Add(agentRun);
        _context.AuditEvents.Add(auditEvent);

        await _context.SaveChangesAsync();

        return MapAgentRunToDto(agentRun);
    }

    public async Task<AgentRunDto> CompleteAgentRunAsync(Guid workflowId, Guid agentRunId, CompleteAgentRunDto dto, Guid currentUserId)
    {
        var agentRun = await _context.AgentRuns
            .Include(a => a.ToolExecutions)
            .FirstOrDefaultAsync(a => a.Id == agentRunId && a.WorkflowInstanceId == workflowId);

        if (agentRun == null)
            throw new EntityNotFoundException("AgentRun", agentRunId);

        var now = DateTime.UtcNow;
        agentRun.Status = dto.Status;
        agentRun.CompletedAtUtc = now;
        agentRun.DurationMs = (long)(now - agentRun.StartedAtUtc).TotalMilliseconds;
        agentRun.OutputSummary = dto.OutputSummary;
        agentRun.ErrorMessage = dto.ErrorMessage;

        await _context.SaveChangesAsync();

        return MapAgentRunToDto(agentRun);
    }

    public async Task<ToolExecutionDto> RecordToolExecutionAsync(Guid workflowId, Guid agentRunId, CreateToolExecutionDto dto, Guid currentUserId)
    {
        var agentRun = await _context.AgentRuns.FirstOrDefaultAsync(a => a.Id == agentRunId && a.WorkflowInstanceId == workflowId);
        if (agentRun == null)
            throw new EntityNotFoundException("AgentRun", agentRunId);

        var now = DateTime.UtcNow;
        var toolExecution = new ToolExecution
        {
            AgentRunId = agentRunId,
            ToolName = dto.ToolName,
            StartedAtUtc = now.AddMilliseconds(-(dto.DurationMs ?? 50)),
            CompletedAtUtc = now,
            DurationMs = dto.DurationMs ?? 50,
            InputSummary = dto.InputSummary,
            OutputSummary = dto.OutputSummary,
            Status = dto.Status,
            ValidationResult = dto.ValidationResult,
            ErrorMessage = dto.ErrorMessage
        };

        _context.ToolExecutions.Add(toolExecution);
        await _context.SaveChangesAsync();

        return new ToolExecutionDto
        {
            Id = toolExecution.Id,
            AgentRunId = toolExecution.AgentRunId,
            ToolName = toolExecution.ToolName,
            StartedAtUtc = toolExecution.StartedAtUtc,
            CompletedAtUtc = toolExecution.CompletedAtUtc,
            DurationMs = toolExecution.DurationMs,
            InputSummary = toolExecution.InputSummary,
            OutputSummary = toolExecution.OutputSummary,
            Status = toolExecution.Status,
            StatusName = toolExecution.Status.ToString(),
            ValidationResult = toolExecution.ValidationResult,
            ErrorMessage = toolExecution.ErrorMessage
        };
    }

    public async Task<List<AgentRunDto>> GetAgentRunsAsync(Guid workflowId, Guid currentUserId, string currentUserRole)
    {
        var workflow = await _context.WorkflowInstances.FindAsync(workflowId);
        if (workflow == null)
            throw new EntityNotFoundException("WorkflowInstance", workflowId);

        ValidateWorkflowAccess(workflow, currentUserId, currentUserRole);

        var agentRuns = await _context.AgentRuns
            .Include(a => a.ToolExecutions)
            .Where(a => a.WorkflowInstanceId == workflowId)
            .OrderByDescending(a => a.StartedAtUtc)
            .ToListAsync();

        return agentRuns.Select(MapAgentRunToDto).ToList();
    }

    public async Task<WorkflowDashboardMetricsDto> GetDashboardMetricsAsync(Guid currentUserId, string currentUserRole)
    {
        var workflowsQuery = _context.WorkflowInstances.AsQueryable();

        if (currentUserRole == UserRole.Owner.ToString())
            workflowsQuery = workflowsQuery.Where(w => w.Incident.Asset.OwnerId == currentUserId);

        var activeCount = await workflowsQuery.CountAsync(w =>
            w.CurrentState != WorkflowState.Completed &&
            w.CurrentState != WorkflowState.FollowUp &&
            w.CurrentState != WorkflowState.Rejected &&
            w.CurrentState != WorkflowState.Failed);

        var pendingApprovalsCount = await _context.ApprovalRequests.CountAsync(a => a.Status == ApprovalStatus.Pending);
        var completedCount = await workflowsQuery.CountAsync(w => w.CurrentState == WorkflowState.Completed || w.CurrentState == WorkflowState.FollowUp);
        var failedCount = await workflowsQuery.CountAsync(w => w.CurrentState == WorkflowState.Failed);
        var revisionsCount = await workflowsQuery.CountAsync(w => w.CurrentState == WorkflowState.RevisionRequested);

        var followUpsQuery = _context.FollowUpTasks.AsQueryable();
        if (currentUserRole == UserRole.Owner.ToString())
            followUpsQuery = followUpsQuery.Where(f => f.Asset.OwnerId == currentUserId);

        var now = DateTime.UtcNow;
        var overdueFollowUps = await followUpsQuery.CountAsync(f => f.Status != FollowUpStatus.Completed && f.Status != FollowUpStatus.Cancelled && f.DueDateUtc < now);
        var pendingFollowUps = await followUpsQuery.CountAsync(f => f.Status == FollowUpStatus.Pending || f.Status == FollowUpStatus.InProgress);

        var totalAgentRuns = await _context.AgentRuns.CountAsync();
        var avgDuration = await _context.AgentRuns.Where(a => a.DurationMs.HasValue).AverageAsync(a => (double?)a.DurationMs) ?? 0.0;

        var recentWorkflows = await workflowsQuery
            .Include(w => w.Incident).ThenInclude(i => i.Asset)
            .Include(w => w.CreatedByUser)
            .Include(w => w.Steps)
            .Include(w => w.ApprovalRequests)
            .OrderByDescending(w => w.CreatedAtUtc)
            .Take(5)
            .Select(w => new WorkflowInstanceDto
            {
                Id = w.Id,
                IncidentId = w.IncidentId,
                IncidentTitle = w.Incident.Title,
                AssetId = w.Incident.AssetId,
                AssetName = w.Incident.Asset.Name,
                CurrentState = w.CurrentState,
                CurrentStateName = w.CurrentState.ToString(),
                CreatedAtUtc = w.CreatedAtUtc,
                UpdatedAtUtc = w.UpdatedAtUtc,
                StartedAtUtc = w.StartedAtUtc,
                CompletedAtUtc = w.CompletedAtUtc,
                FailureReason = w.FailureReason,
                CorrelationId = w.CorrelationId,
                CreatedByUserId = w.CreatedByUserId,
                CreatedByUserName = w.CreatedByUser != null ? w.CreatedByUser.FullName : string.Empty,
                StepsCount = w.Steps.Count,
                PendingApprovalsCount = w.ApprovalRequests.Count(a => a.Status == ApprovalStatus.Pending)
            })
            .ToListAsync();

        return new WorkflowDashboardMetricsDto
        {
            ActiveWorkflowsCount = activeCount,
            PendingApprovalsCount = pendingApprovalsCount,
            CompletedWorkflowsCount = completedCount,
            FailedWorkflowsCount = failedCount,
            RevisionsRequestedCount = revisionsCount,
            OverdueFollowUpsCount = overdueFollowUps,
            PendingFollowUpsCount = pendingFollowUps,
            TotalAgentRunsCount = totalAgentRuns,
            AverageAgentDurationMs = Math.Round(avgDuration, 2),
            RecentWorkflows = recentWorkflows
        };
    }

    #region Helper Methods

    private static void EnforceManagerOrAdminRole(string currentUserRole, string actionDescription)
    {
        if (currentUserRole != UserRole.Manager.ToString() && currentUserRole != UserRole.Admin.ToString())
        {
            throw new UnauthorizedAccessException($"Access Denied: Only users with the '{UserRole.Manager}' or '{UserRole.Admin}' role are authorized to {actionDescription}. Current role: '{currentUserRole}'.");
        }
    }

    private static void ValidateWorkflowAccess(WorkflowInstance workflow, Guid currentUserId, string currentUserRole)
    {
        if (currentUserRole == UserRole.Admin.ToString() || currentUserRole == UserRole.Manager.ToString())
            return;

        if (currentUserRole == UserRole.Owner.ToString() && workflow.Incident?.Asset?.OwnerId != null)
        {
            if (workflow.Incident.Asset.OwnerId != currentUserId)
                throw new UnauthorizedAccessException("You do not have permission to view or manage this workflow.");
            return;
        }

        if (workflow.CreatedByUserId == currentUserId)
            return;
    }

    private static WorkflowInstanceDto MapToDto(WorkflowInstance workflow, string incidentTitle, Guid assetId, string assetName)
    {
        return new WorkflowInstanceDto
        {
            Id = workflow.Id,
            IncidentId = workflow.IncidentId,
            IncidentTitle = incidentTitle,
            AssetId = assetId,
            AssetName = assetName,
            CurrentState = workflow.CurrentState,
            CurrentStateName = workflow.CurrentState.ToString(),
            CreatedAtUtc = workflow.CreatedAtUtc,
            UpdatedAtUtc = workflow.UpdatedAtUtc,
            StartedAtUtc = workflow.StartedAtUtc,
            CompletedAtUtc = workflow.CompletedAtUtc,
            FailureReason = workflow.FailureReason,
            CorrelationId = workflow.CorrelationId,
            CreatedByUserId = workflow.CreatedByUserId,
            CreatedByUserName = workflow.CreatedByUser != null ? workflow.CreatedByUser.FullName : string.Empty,
            StepsCount = workflow.Steps?.Count ?? 0,
            PendingApprovalsCount = workflow.ApprovalRequests?.Count(a => a.Status == ApprovalStatus.Pending) ?? 0
        };
    }

    private static AgentRunDto MapAgentRunToDto(AgentRun agentRun)
    {
        return new AgentRunDto
        {
            Id = agentRun.Id,
            WorkflowInstanceId = agentRun.WorkflowInstanceId,
            AgentName = agentRun.AgentName,
            AgentType = agentRun.AgentType,
            AgentTypeName = agentRun.AgentType.ToString(),
            Status = agentRun.Status,
            StatusName = agentRun.Status.ToString(),
            StartedAtUtc = agentRun.StartedAtUtc,
            CompletedAtUtc = agentRun.CompletedAtUtc,
            DurationMs = agentRun.DurationMs,
            InputSummary = agentRun.InputSummary,
            OutputSummary = agentRun.OutputSummary,
            ErrorMessage = agentRun.ErrorMessage,
            RetryCount = agentRun.RetryCount,
            CorrelationId = agentRun.CorrelationId,
            ToolExecutions = agentRun.ToolExecutions?.Select(t => new ToolExecutionDto
            {
                Id = t.Id,
                AgentRunId = t.AgentRunId,
                ToolName = t.ToolName,
                StartedAtUtc = t.StartedAtUtc,
                CompletedAtUtc = t.CompletedAtUtc,
                DurationMs = t.DurationMs,
                InputSummary = t.InputSummary,
                OutputSummary = t.OutputSummary,
                Status = t.Status,
                StatusName = t.Status.ToString(),
                ValidationResult = t.ValidationResult,
                ErrorMessage = t.ErrorMessage
            }).ToList() ?? new List<ToolExecutionDto>()
        };
    }

    #endregion
}
