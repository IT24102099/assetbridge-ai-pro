using AssetBridge.Domain.Enums;

namespace AssetBridge.Application.DTOs.Workflow;

public class WorkflowInstanceDto
{
    public Guid Id { get; set; }
    public Guid IncidentId { get; set; }
    public string IncidentTitle { get; set; } = string.Empty;
    public Guid AssetId { get; set; }
    public string AssetName { get; set; } = string.Empty;
    public WorkflowState CurrentState { get; set; }
    public string CurrentStateName { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
    public DateTime? StartedAtUtc { get; set; }
    public DateTime? CompletedAtUtc { get; set; }
    public string? FailureReason { get; set; }
    public string CorrelationId { get; set; } = string.Empty;
    public Guid CreatedByUserId { get; set; }
    public string CreatedByUserName { get; set; } = string.Empty;
    public int StepsCount { get; set; }
    public int PendingApprovalsCount { get; set; }
}

public class CreateWorkflowRequestDto
{
    public Guid IncidentId { get; set; }
    public string? InitialNotes { get; set; }
}

public class TransitionWorkflowRequestDto
{
    public WorkflowState TargetState { get; set; }
    public string? Reason { get; set; }
    public string? Actor { get; set; }
    public string? MetadataJson { get; set; }
}

public class FailWorkflowRequestDto
{
    public string FailureReason { get; set; } = string.Empty;
    public string? Details { get; set; }
}

public class WorkflowFilterParametersDto
{
    public WorkflowState? State { get; set; }
    public Guid? IncidentId { get; set; }
    public Guid? AssetId { get; set; }
    public DateTime? FromDateUtc { get; set; }
    public DateTime? ToDateUtc { get; set; }
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 10;
    public string? SortBy { get; set; } = "CreatedAtUtc";
    public bool SortDescending { get; set; } = true;
}

public class WorkflowStepDto
{
    public Guid Id { get; set; }
    public Guid WorkflowInstanceId { get; set; }
    public WorkflowState StepState { get; set; }
    public string StepStateName { get; set; } = string.Empty;
    public WorkflowStepStatus Status { get; set; }
    public string StatusName { get; set; } = string.Empty;
    public DateTime StartedAtUtc { get; set; }
    public DateTime? CompletedAtUtc { get; set; }
    public string StartedBy { get; set; } = string.Empty;
    public string? CompletedBy { get; set; }
    public string? Notes { get; set; }
    public string? ErrorMessage { get; set; }
    public double? DurationSeconds { get; set; }
}

public class WorkflowTimelineDto
{
    public Guid WorkflowInstanceId { get; set; }
    public Guid IncidentId { get; set; }
    public WorkflowState CurrentState { get; set; }
    public string CurrentStateName { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? CompletedAtUtc { get; set; }
    public List<WorkflowStepDto> Steps { get; set; } = new();
    public List<ApprovalRequestDto> Approvals { get; set; } = new();
    public List<AuditEventDto> AuditEvents { get; set; } = new();
}
