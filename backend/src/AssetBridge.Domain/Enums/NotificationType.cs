namespace AssetBridge.Domain.Enums;

// Defines internal notification categories for workflow status and approval events.
public enum NotificationType
{
    ApprovalRequired = 1,
    Approved = 2,
    Rejected = 3,
    RevisionRequested = 4,
    WorkflowStatusChanged = 5,
    ExecutionStarted = 6,
    ExecutionCompleted = 7,
    FollowUpReminder = 8
}
