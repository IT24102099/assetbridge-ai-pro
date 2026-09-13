using AssetBridge.Domain.Entities.Common;
using AssetBridge.Domain.Entities.Users;
using AssetBridge.Domain.Enums;

namespace AssetBridge.Domain.Entities.Workflow;

// Enforces human-in-the-loop governance for high-impact decisions (quotations, budget approvals, repair authorization).
// AI recommendations cannot directly commit funds or authorize repairs without an approved ApprovalRequest.
public class ApprovalRequest : BaseEntity
{
    public Guid WorkflowInstanceId { get; set; }
    public WorkflowInstance WorkflowInstance { get; set; } = null!;

    // The user or agent process that requested human approval
    public Guid RequestedByUserId { get; set; }
    public User RequestedByUser { get; set; } = null!;

    // Specific manager assigned to review this request (optional)
    public Guid? AssignedApproverUserId { get; set; }
    public User? AssignedApproverUser { get; set; }

    // Current approval lifecycle status
    public ApprovalStatus Status { get; set; } = ApprovalStatus.Pending;

    // The decision made by an authorized human
    public ApprovalDecision? Decision { get; set; }

    // Rationale provided by the approver for approval or rejection
    public string? DecisionReason { get; set; }

    // Timestamp when the approval request was created
    public DateTime RequestedAtUtc { get; set; } = DateTime.UtcNow;

    // Timestamp when the authorized human recorded their decision
    public DateTime? DecidedAtUtc { get; set; }

    // Feedback or requested adjustments if revision was requested
    public string? RevisionComment { get; set; }
}
