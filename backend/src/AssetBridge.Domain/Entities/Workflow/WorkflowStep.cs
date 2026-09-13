using AssetBridge.Domain.Entities.Common;
using AssetBridge.Domain.Enums;

namespace AssetBridge.Domain.Entities.Workflow;

// Tracks an individual stage execution within a workflow instance.
// Provides historical trace so users can see how each step progressed.
public class WorkflowStep : BaseEntity
{
    public Guid WorkflowInstanceId { get; set; }
    public WorkflowInstance WorkflowInstance { get; set; } = null!;

    // The workflow state / stage represented by this step
    public WorkflowState StepState { get; set; }

    // Execution status of the step
    public WorkflowStepStatus Status { get; set; } = WorkflowStepStatus.InProgress;

    // Time the step started
    public DateTime StartedAtUtc { get; set; } = DateTime.UtcNow;

    // Time the step concluded
    public DateTime? CompletedAtUtc { get; set; }

    // Actor or system identifier that initiated the step (e.g., "User:123" or "Agent:IncidentPlanner")
    public string StartedBy { get; set; } = string.Empty;

    // Actor or system identifier that completed the step
    public string? CompletedBy { get; set; }

    // Operational notes or execution output summary
    public string? Notes { get; set; }

    // Error details if this step encountered a fault
    public string? ErrorMessage { get; set; }
}
