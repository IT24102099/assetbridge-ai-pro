namespace AssetBridge.Domain.Enums;

// Status of a post-maintenance continuity or preventive inspection follow-up task.
public enum FollowUpStatus
{
    Pending = 1,
    InProgress = 2,
    Completed = 3,
    Cancelled = 4,
    Overdue = 5
}
