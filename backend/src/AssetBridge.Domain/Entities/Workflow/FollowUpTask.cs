using AssetBridge.Domain.Entities.Assets;
using AssetBridge.Domain.Entities.Common;
using AssetBridge.Domain.Entities.Users;
using AssetBridge.Domain.Entities.Workflow;
using AssetBridge.Domain.Enums;

namespace AssetBridge.Domain.Entities.Workflow;

// Connects completed maintenance back to long-term property continuity.
// Represents post-repair inspection, warranty milestone check, or preventive maintenance tasks.
public class FollowUpTask : BaseEntity
{
    // The workflow instance that generated this follow-up (null if direct preventive task)
    public Guid? WorkflowInstanceId { get; set; }
    public WorkflowInstance? WorkflowInstance { get; set; }

    // The asset/property under long-term continuity management
    public Guid AssetId { get; set; }
    public Asset Asset { get; set; } = null!;

    // Actionable task title (e.g. "Post-repair plumbing pressure check (30 days)")
    public string Title { get; set; } = string.Empty;

    // Detailed instruction or checklist for representative/service provider
    public string Description { get; set; } = string.Empty;

    // Target deadline in UTC
    public DateTime DueDateUtc { get; set; }

    // Current task status
    public FollowUpStatus Status { get; set; } = FollowUpStatus.Pending;

    // Relative priority
    public FollowUpPriority Priority { get; set; } = FollowUpPriority.Medium;

    // Timestamp when task was completed
    public DateTime? CompletedAtUtc { get; set; }

    // User assigned to perform or oversee this follow-up task
    public Guid? AssignedToUserId { get; set; }
    public User? AssignedToUser { get; set; }
}
