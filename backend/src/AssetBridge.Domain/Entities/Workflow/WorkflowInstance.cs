using AssetBridge.Domain.Entities.Common;
using AssetBridge.Domain.Entities.Incidents;
using AssetBridge.Domain.Entities.Users;
using AssetBridge.Domain.Enums;

namespace AssetBridge.Domain.Entities.Workflow;

// Represents the lifecycle execution of an automated, human-in-the-loop maintenance incident workflow.
// Enforces strict state progression from Incident creation through AI recommendation, human approval,
// execution, and long-term continuity follow-up.
public class WorkflowInstance : BaseEntity
{
    // The incident that triggered this workflow orchestration
    public Guid IncidentId { get; set; }
    public Incident Incident { get; set; } = null!;

    // Current state in the 15-state deterministic state machine
    public WorkflowState CurrentState { get; set; } = WorkflowState.Created;

    // Time when the workflow formally started execution
    public DateTime? StartedAtUtc { get; set; }

    // Time when the workflow reached a terminal state (Completed / Rejected / Failed)
    public DateTime? CompletedAtUtc { get; set; }

    // Human-readable failure explanation if transition or step failed
    public string? FailureReason { get; set; }

    // End-to-end distributed tracing / correlation ID
    public string CorrelationId { get; set; } = Guid.NewGuid().ToString("N");

    // The user (Owner, Representative, or Manager) who triggered this workflow
    public Guid CreatedByUserId { get; set; }
    public User CreatedByUser { get; set; } = null!;

    // Complete audit trail of past workflow steps
    public ICollection<WorkflowStep> Steps { get; set; } = new List<WorkflowStep>();

    // High-impact human approval requests associated with this workflow
    public ICollection<ApprovalRequest> ApprovalRequests { get; set; } = new List<ApprovalRequest>();

    // AI agent execution traces linked to this workflow
    public ICollection<AgentRun> AgentRuns { get; set; } = new List<AgentRun>();

    // Immutable timeline audit logs
    public ICollection<AuditEvent> AuditEvents { get; set; } = new List<AuditEvent>();

    // Post-maintenance continuity follow-up tasks
    public ICollection<FollowUpTask> FollowUpTasks { get; set; } = new List<FollowUpTask>();
}
