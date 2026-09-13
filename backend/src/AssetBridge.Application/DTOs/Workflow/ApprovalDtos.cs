using AssetBridge.Domain.Enums;

namespace AssetBridge.Application.DTOs.Workflow;

public class ApprovalRequestDto
{
    public Guid Id { get; set; }
    public Guid WorkflowInstanceId { get; set; }
    public Guid RequestedByUserId { get; set; }
    public string RequestedByUserName { get; set; } = string.Empty;
    public Guid? AssignedApproverUserId { get; set; }
    public string? AssignedApproverUserName { get; set; }
    public ApprovalStatus Status { get; set; }
    public string StatusName { get; set; } = string.Empty;
    public ApprovalDecision? Decision { get; set; }
    public string? DecisionName { get; set; }
    public string? DecisionReason { get; set; }
    public DateTime RequestedAtUtc { get; set; }
    public DateTime? DecidedAtUtc { get; set; }
    public string? RevisionComment { get; set; }
}

public class CreateApprovalRequestDto
{
    public Guid? AssignedApproverUserId { get; set; }
    public string? InitialNotes { get; set; }
}

public class ApprovalDecisionRequestDto
{
    public string DecisionReason { get; set; } = string.Empty;
}

public class RevisionRequestDto
{
    public string RevisionComment { get; set; } = string.Empty;
    public string DecisionReason { get; set; } = string.Empty;
}
