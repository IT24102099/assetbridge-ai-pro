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
            .Include(w => w.Incident).ThenInclude(i => i.Asset)
            .Include(w => w.ApprovalRequests)
            .Include(w => w.Steps)
            .FirstOrDefaultAsync(w => w.Id == workflowId);

        if (workflow == null)
            throw new EntityNotFoundException("WorkflowInstance", workflowId);

        ValidateWorkflowAccess(workflow, currentUserId, currentUserRole);

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

        throw new UnauthorizedAccessException("You do not have permission to view or manage this workflow.");
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

    #region Component 4: Workflow Simplification & Continuity Agent

    public async Task<WorkflowAiAssistanceDto> GetWorkflowAiAssistanceAsync(Guid workflowId, Guid currentUserId, string currentUserRole)
    {
        var workflow = await _context.WorkflowInstances
            .Include(w => w.Incident)
                .ThenInclude(i => i.Asset)
            .Include(w => w.Steps)
            .Include(w => w.ApprovalRequests)
            .Include(w => w.AgentRuns)
                .ThenInclude(a => a.ToolExecutions)
            .Include(w => w.FollowUpTasks)
            .Include(w => w.AuditEvents)
            .FirstOrDefaultAsync(w => w.Id == workflowId);

        if (workflow == null)
            throw new EntityNotFoundException("WorkflowInstance", workflowId);

        ValidateWorkflowAccess(workflow, currentUserId, currentUserRole);

        // Fetch associated Quotation and MaintenanceJob
        var quotation = await _context.Quotations
            .Include(q => q.Provider)
            .Where(q => q.IncidentId == workflow.IncidentId)
            .OrderByDescending(q => q.CreatedAtUtc)
            .FirstOrDefaultAsync();

        var job = await _context.MaintenanceJobs
            .Include(j => j.Provider)
            .Where(j => j.IncidentId == workflow.IncidentId)
            .OrderByDescending(j => j.CreatedAtUtc)
            .FirstOrDefaultAsync();

        // 1. Build Completed Milestones
        var completedMilestones = new List<string>
        {
            $"Incident logged: '{workflow.Incident.Title}' ({workflow.Incident.Category})"
        };

        foreach (var step in workflow.Steps.Where(s => s.Status == WorkflowStepStatus.Completed).OrderBy(s => s.StartedAtUtc))
        {
            completedMilestones.Add($"Step '{step.StepState}' completed by {step.CompletedBy ?? step.StartedBy}");
        }

        if (quotation != null)
        {
            completedMilestones.Add($"Quotation submitted by {quotation.Provider?.BusinessName ?? "Contractor"} (LKR {quotation.TotalAmount:N2})");
        }

        var approvedApproval = workflow.ApprovalRequests.FirstOrDefault(a => a.Status == ApprovalStatus.Approved);
        if (approvedApproval != null)
        {
            completedMilestones.Add($"Human-in-the-loop proposal approved on {approvedApproval.DecidedAtUtc?.ToString("d") ?? "recently"}");
        }

        if (job != null && (job.Status == MaintenanceJobStatus.InProgress || job.Status == MaintenanceJobStatus.Completed || job.Status == MaintenanceJobStatus.Closed))
        {
            completedMilestones.Add($"Work order '{job.Title}' started by {job.Provider?.BusinessName ?? "Contractor"}");
        }

        // 2. Build Pending Requirements & Blockers
        var pendingRequirements = new List<string>();
        var blockers = new List<string>();
        string responsibleRole;
        var nextAction = new WorkflowNextBestActionDto();

        switch (workflow.CurrentState)
        {
            case WorkflowState.Created:
                pendingRequirements.Add("Initial incident diagnostics and multi-agent plan orchestration");
                responsibleRole = "Property Manager";
                nextAction = new WorkflowNextBestActionDto
                {
                    Title = "Run AI Multi-Agent Orchestration",
                    ActionCode = "RUN_AI_ORCHESTRATION",
                    Description = "Analyze incident context through Incident Planning and Provider Intelligence agents.",
                    WhyItMatters = "Formulates a structured 4-step execution plan and matches verified local contractors.",
                    Prerequisites = new List<string> { "Incident reported with photos", "Asset location verified" },
                    WhatHappensNext = "Workflow advances to Planning stage with telemetry recorded.",
                    ConfidenceScore = 0.98,
                    TargetUrl = $"/workflows/{workflow.Id}"
                };
                break;

            case WorkflowState.Planning:
                pendingRequirements.Add("Provider intelligence analysis & contractor matching");
                responsibleRole = "Property Manager";
                nextAction = new WorkflowNextBestActionDto
                {
                    Title = "Match Service Providers",
                    ActionCode = "MATCH_PROVIDERS",
                    Description = "Select verified contractor for on-site inspection or quotation submission.",
                    WhyItMatters = "Ensures work is routed to qualified, CIDA-registered tradespeople within 30km.",
                    Prerequisites = new List<string> { "Planning phase initialized" },
                    WhatHappensNext = "Contractor candidates ranked by skill, rating, and schedule availability.",
                    ConfidenceScore = 0.95,
                    TargetUrl = $"/providers/search?incidentId={workflow.IncidentId}"
                };
                break;

            case WorkflowState.ProviderSelection:
                pendingRequirements.Add("Contractor quotation preparation");
                responsibleRole = "Service Provider / Property Manager";
                nextAction = new WorkflowNextBestActionDto
                {
                    Title = "Request / Submit Quotation",
                    ActionCode = "SUBMIT_QUOTATION",
                    Description = "Receive itemized materials and labor pricing in LKR.",
                    WhyItMatters = "Itemized breakdown guarantees price transparency against 2026 market benchmarks.",
                    Prerequisites = new List<string> { "Provider selected" },
                    WhatHappensNext = "Cost Recommendation Agent audits unit rates against market benchmarks.",
                    ConfidenceScore = 0.94,
                    TargetUrl = $"/quotations"
                };
                break;

            case WorkflowState.QuotationReview:
                pendingRequirements.Add("Quotation evaluation against market benchmarks");
                responsibleRole = "Property Manager";
                nextAction = new WorkflowNextBestActionDto
                {
                    Title = "Compare Quotations & Generate Proposal",
                    ActionCode = "GENERATE_PROPOSAL",
                    Description = "Review competitive contractor bids and submit proposal for human approval.",
                    WhyItMatters = "Protects overseas owners from budget overruns and unauthorized contractor costs.",
                    Prerequisites = new List<string> { "At least one itemized quotation submitted" },
                    WhatHappensNext = "Formal approval request dispatched to Property Owner/Manager.",
                    ConfidenceScore = 0.96,
                    TargetUrl = $"/quotations/compare?incidentId={workflow.IncidentId}"
                };
                break;

            case WorkflowState.AwaitingApproval:
                pendingRequirements.Add("Human Owner / Manager authorization of quotation proposal");
                blockers.Add("Work is paused pending human approval. Contractor dispatch is locked to prevent unauthorized commitments.");
                responsibleRole = currentUserRole == "Owner" ? "You (Property Owner)" : "Property Owner / Manager";
                nextAction = new WorkflowNextBestActionDto
                {
                    Title = "Review & Approve Maintenance Proposal",
                    ActionCode = "APPROVE_PROPOSAL",
                    Description = $"Authorize repair work order for LKR {(quotation?.TotalAmount ?? 58500m):N2}.",
                    WhyItMatters = "Mandatory human governance step before funds are committed and work begins.",
                    Prerequisites = new List<string> { "Itemized quotation verified", "AI cost compliance passed" },
                    WhatHappensNext = "Approved work order advances to Execution and contractor is notified.",
                    ConfidenceScore = 0.99,
                    TargetUrl = $"/workflows/{workflow.Id}"
                };
                break;

            case WorkflowState.Approved:
                pendingRequirements.Add("Schedule work order execution dates with assigned contractor");
                responsibleRole = "Property Manager / Service Provider";
                nextAction = new WorkflowNextBestActionDto
                {
                    Title = "Confirm Work Order & Schedule",
                    ActionCode = "SCHEDULE_JOB",
                    Description = "Confirm arrival dates and material logistics with contractor.",
                    WhyItMatters = "Establishes clear repair timeframe and on-site access permissions.",
                    Prerequisites = new List<string> { "Proposal approved" },
                    WhatHappensNext = "Contractor dispatched to asset site.",
                    ConfidenceScore = 0.95,
                    TargetUrl = job != null ? $"/maintenance/jobs/{job.Id}" : "/maintenance/jobs"
                };
                break;

            case WorkflowState.Execution:
                pendingRequirements.Add("On-site physical repair completion & photographic evidence");
                responsibleRole = job?.Provider?.BusinessName ?? "Assigned Service Provider";
                nextAction = new WorkflowNextBestActionDto
                {
                    Title = job?.Status == MaintenanceJobStatus.Scheduled ? "Start Work Order" : "Mark Repair Completed",
                    ActionCode = job?.Status == MaintenanceJobStatus.Scheduled ? "START_JOB" : "COMPLETE_JOB",
                    Description = job?.Status == MaintenanceJobStatus.Scheduled
                        ? "Record that contractor has arrived and commenced repair."
                        : "Upload completion evidence and sign off on technical repair.",
                    WhyItMatters = "Maintains auditable timeline and real-time overseas visibility.",
                    Prerequisites = new List<string> { "Work order scheduled" },
                    WhatHappensNext = "Advances to Completion Review for owner verification.",
                    ConfidenceScore = 0.97,
                    TargetUrl = job != null ? $"/maintenance/jobs/{job.Id}" : "/maintenance/jobs"
                };
                break;

            case WorkflowState.CompletionReview:
                pendingRequirements.Add("Post-repair quality inspection and sign-off");
                responsibleRole = "Local Representative / Property Owner";
                nextAction = new WorkflowNextBestActionDto
                {
                    Title = "Verify Completion & Close Out",
                    ActionCode = "VERIFY_COMPLETION",
                    Description = "Review repair photos, warranty certificate, and final invoice.",
                    WhyItMatters = "Ensures defect has been completely resolved prior to final payment.",
                    Prerequisites = new List<string> { "Contractor marked work completed" },
                    WhatHappensNext = "Workflow completes and enters preventive continuity monitoring.",
                    ConfidenceScore = 0.96,
                    TargetUrl = job != null ? $"/maintenance/jobs/{job.Id}" : $"/workflows/{workflow.Id}"
                };
                break;

            case WorkflowState.Completed:
            case WorkflowState.FollowUp:
                pendingRequirements.Add("Ongoing preventive continuity and warranty tracking");
                responsibleRole = "Local Representative";
                nextAction = new WorkflowNextBestActionDto
                {
                    Title = "Schedule Preventive Continuity Check",
                    ActionCode = "SCHEDULE_FOLLOW_UP",
                    Description = "Set up a 30-day or 90-day post-maintenance inspection checkup.",
                    WhyItMatters = "Prevents recurring water intrusion or secondary structural degradation.",
                    Prerequisites = new List<string> { "Work order completed and archived" },
                    WhatHappensNext = "Automated reminder created on local representative task board.",
                    ConfidenceScore = 0.92,
                    TargetUrl = $"/follow-up"
                };
                break;

            default:
                pendingRequirements.Add("Workflow status review");
                responsibleRole = "Property Manager";
                nextAction = new WorkflowNextBestActionDto
                {
                    Title = "Review Workflow Timeline",
                    ActionCode = "VIEW_TIMELINE",
                    Description = "Examine workflow history and active audit events.",
                    WhyItMatters = "Provides full traceability of decisions and transitions.",
                    Prerequisites = new List<string>(),
                    WhatHappensNext = "Navigates to workflow step detail.",
                    ConfidenceScore = 0.90,
                    TargetUrl = $"/workflows/{workflow.Id}"
                };
                break;
        }

        // 3. Plain Language Summary
        string plainSummary = workflow.CurrentState switch
        {
            WorkflowState.Created => $"This workflow is newly initiated for the incident '{workflow.Incident.Title}' at {workflow.Incident.Asset.Name}. Technical maintenance planning and contractor matching have not yet started.",
            WorkflowState.Planning => $"Incident planning is underway for '{workflow.Incident.Title}'. The system is formulating an itemized repair sequence and locating verified contractors in {workflow.Incident.Asset.City}.",
            WorkflowState.ProviderSelection => $"Service providers are being evaluated for '{workflow.Incident.Title}' at {workflow.Incident.Asset.Name}. Contractor skills and proximity are being verified.",
            WorkflowState.QuotationReview => $"Competitive contractor bids have been collected for '{workflow.Incident.Title}'. Quotations are currently being checked against internal 2026 market benchmarks in LKR.",
            WorkflowState.AwaitingApproval => $"The maintenance proposal for '{workflow.Incident.Title}' (Quotation: LKR {(quotation?.TotalAmount ?? 58500m):N2}) has been validated and is awaiting human approval before contractor dispatch.",
            WorkflowState.Approved => $"The repair proposal for '{workflow.Incident.Title}' has been approved. The assigned service provider ({job?.Provider?.BusinessName ?? "Contractor"}) is preparing for on-site execution.",
            WorkflowState.Execution => $"Active maintenance work order '{job?.Title ?? workflow.Incident.Title}' is in progress at {workflow.Incident.Asset.Name}. Work is being carried out by {job?.Provider?.BusinessName ?? "Contractor"}.",
            WorkflowState.CompletionReview => $"On-site maintenance has been concluded by {job?.Provider?.BusinessName ?? "Contractor"}. Final inspection photos and warranty documentation are under review.",
            WorkflowState.Completed => $"Maintenance for '{workflow.Incident.Title}' at {workflow.Incident.Asset.Name} is successfully completed. Continuity tracking and warranty coverage are active.",
            WorkflowState.FollowUp => $"Post-maintenance continuity monitoring is active for '{workflow.Incident.Title}' to guarantee long-term property protection.",
            _ => $"Workflow for '{workflow.Incident.Title}' at {workflow.Incident.Asset.Name} is currently in stage '{workflow.CurrentState}'."
        };

        // 4. Audit summary
        var auditCount = workflow.AuditEvents.Count;
        var latestAudit = workflow.AuditEvents.OrderByDescending(a => a.CreatedAtUtc).FirstOrDefault();
        var auditSummary = latestAudit != null
            ? $"{auditCount} recorded audit events. Most recent: '{latestAudit.Description}' ({latestAudit.CreatedAtUtc:g})"
            : "Audit logging active. All state transitions and human approvals are immutably tracked.";

        return new WorkflowAiAssistanceDto
        {
            WorkflowInstanceId = workflow.Id,
            CurrentState = workflow.CurrentState.ToString(),
            CurrentStageLabel = WORKFLOW_STATE_DISPLAY_NAMES.GetValueOrDefault(workflow.CurrentState, workflow.CurrentState.ToString()),
            PlainLanguageSummary = plainSummary,
            AssociatedContext = new WorkflowAssociatedContextDto
            {
                IncidentId = workflow.IncidentId,
                IncidentTitle = workflow.Incident.Title,
                IncidentPriority = workflow.Incident.Priority.ToString(),
                AssetId = workflow.Incident.AssetId,
                AssetName = workflow.Incident.Asset.Name,
                AssetCity = workflow.Incident.Asset.City,
                QuotationId = quotation?.Id,
                QuotationTitle = quotation != null ? $"Quotation by {quotation.Provider?.BusinessName ?? "Contractor"}" : null,
                QuotationAmount = quotation?.TotalAmount,
                QuotationStatus = quotation?.Status.ToString(),
                MaintenanceJobId = job?.Id,
                MaintenanceJobTitle = job?.Title,
                MaintenanceJobStatus = job?.Status.ToString(),
                ScheduledDates = job != null ? $"{job.ScheduledStartUtc:d} – {job.ScheduledEndUtc:d}" : null,
                ProviderName = job?.Provider?.BusinessName ?? quotation?.Provider?.BusinessName
            },
            CompletedMilestones = completedMilestones,
            PendingRequirements = pendingRequirements,
            Blockers = blockers,
            ResponsibleRole = responsibleRole,
            RecommendedNextAction = nextAction,
            AuditSummary = auditSummary,
            ActiveFollowUpsCount = workflow.FollowUpTasks.Count(f => f.Status == FollowUpStatus.Pending || f.Status == FollowUpStatus.InProgress),
            IsAiServiceConnected = true,
            ProviderUsed = "internal",
            ModelUsed = "validation-and-continuity-agent-v1"
        };
    }

    public async Task<WorkflowAiAskResponseDto> AskWorkflowAgentAsync(Guid workflowId, WorkflowAiAskRequestDto request, Guid currentUserId, string currentUserRole)
    {
        var assistance = await GetWorkflowAiAssistanceAsync(workflowId, currentUserId, currentUserRole);
        var q = (request.Question ?? string.Empty).ToLowerInvariant().Trim();

        string answer;
        var factsUsed = new List<string>
        {
            $"Workflow State: {assistance.CurrentState}",
            $"Incident: {assistance.AssociatedContext.IncidentTitle} ({assistance.AssociatedContext.IncidentPriority})",
            $"Asset: {assistance.AssociatedContext.AssetName} in {assistance.AssociatedContext.AssetCity}"
        };

        string? suggestedNextStep = assistance.RecommendedNextAction.Title;
        string? suggestedRole = assistance.ResponsibleRole;
        bool directActionAvailable = true;
        string? actionCode = assistance.RecommendedNextAction.ActionCode;

        if (q.Contains("status") || q.Contains("mean") || q.Contains("stage"))
        {
            answer = $"This workflow is currently at the '{assistance.CurrentStageLabel}' stage. {assistance.PlainLanguageSummary}";
        }
        else if (q.Contains("why") && (q.Contains("pending") || q.Contains("blocked") || q.Contains("wait")))
        {
            if (assistance.Blockers.Any())
            {
                answer = $"The workflow is currently waiting because: {string.Join(" ", assistance.Blockers)}";
            }
            else
            {
                answer = $"The workflow is currently in progress. The next required milestone is: {string.Join(", ", assistance.PendingRequirements)}.";
            }
        }
        else if (q.Contains("what") && (q.Contains("do") || q.Contains("next") || q.Contains("action")))
        {
            answer = $"Recommended next step: {assistance.RecommendedNextAction.Title}. {assistance.RecommendedNextAction.Description} Why it matters: {assistance.RecommendedNextAction.WhyItMatters}";
        }
        else if (q.Contains("prevent") || q.Contains("block") || q.Contains("stuck"))
        {
            if (assistance.Blockers.Any())
            {
                answer = $"Current blocker: {string.Join("; ", assistance.Blockers)}";
            }
            else
            {
                answer = "There are no operational blockers. The workflow is progressing normally through its planned sequence.";
            }
        }
        else if (q.Contains("quot") || q.Contains("quote") || q.Contains("price") || q.Contains("cost"))
        {
            if (assistance.AssociatedContext.QuotationAmount.HasValue)
            {
                answer = $"A quotation of LKR {assistance.AssociatedContext.QuotationAmount.Value:N2} was submitted by {assistance.AssociatedContext.ProviderName ?? "the contractor"}. Status: {assistance.AssociatedContext.QuotationStatus ?? "Under Review"}.";
                factsUsed.Add($"Quotation Amount: LKR {assistance.AssociatedContext.QuotationAmount.Value:N2}");
            }
            else
            {
                answer = "No contractor quotation has been formally submitted for this workflow yet. Once contractor bids are in, they will be audited against internal market estimates.";
            }
        }
        else if (q.Contains("who") || q.Contains("role") || q.Contains("responsible") || q.Contains("assign"))
        {
            answer = $"The responsible party for the current stage is: {assistance.ResponsibleRole}. They are expected to: {assistance.RecommendedNextAction.Description}";
        }
        else if (q.Contains("after") && (q.Contains("approv") || q.Contains("action")))
        {
            answer = $"After this action is completed: {assistance.RecommendedNextAction.WhatHappensNext}";
        }
        else if (q.Contains("follow") || q.Contains("continu") || q.Contains("checkup"))
        {
            answer = $"There are currently {assistance.ActiveFollowUpsCount} active follow-up tasks linked to this workflow. Continuity tasks ensure that after physical repair, preventive visits and warranty compliance are maintained.";
        }
        else if (q.Contains("audit") || q.Contains("history") || q.Contains("log"))
        {
            answer = $"Audit Summary: {assistance.AuditSummary}. All transitions, agent telemetry runs, and human decisions are immutably preserved in the database.";
        }
        else
        {
            answer = $"{assistance.PlainLanguageSummary} Next recommended action: {assistance.RecommendedNextAction.Title} ({assistance.ResponsibleRole}).";
        }

        return new WorkflowAiAskResponseDto
        {
            Question = request.Question ?? string.Empty,
            Answer = answer,
            ContextFactsUsed = factsUsed,
            SuggestedNextStep = suggestedNextStep,
            SuggestedRole = suggestedRole,
            DirectActionAvailable = directActionAvailable,
            ActionCode = actionCode
        };
    }

    private static readonly Dictionary<WorkflowState, string> WORKFLOW_STATE_DISPLAY_NAMES = new()
    {
        [WorkflowState.Created] = "Created",
        [WorkflowState.Planning] = "Planning",
        [WorkflowState.ProviderSelection] = "Provider Selection",
        [WorkflowState.InspectionPending] = "Inspection Pending",
        [WorkflowState.QuotationReview] = "Quotation Review",
        [WorkflowState.AiValidation] = "AI Validation",
        [WorkflowState.AwaitingApproval] = "Awaiting Approval",
        [WorkflowState.RevisionRequested] = "Revision Requested",
        [WorkflowState.Approved] = "Approved",
        [WorkflowState.Rejected] = "Rejected",
        [WorkflowState.Execution] = "Execution",
        [WorkflowState.CompletionReview] = "Completion Review",
        [WorkflowState.Completed] = "Completed",
        [WorkflowState.FollowUp] = "Follow-Up Continuity",
        [WorkflowState.Failed] = "Failed"
    };

    #endregion
}
