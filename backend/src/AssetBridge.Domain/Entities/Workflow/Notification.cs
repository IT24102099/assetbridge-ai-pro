using AssetBridge.Domain.Entities.Common;
using AssetBridge.Domain.Entities.Users;
using AssetBridge.Domain.Enums;

namespace AssetBridge.Domain.Entities.Workflow;

// Represents an in-app notification record for workflow status updates, approvals, and reminders.
public class Notification : BaseEntity
{
    // Target user receiving the notification
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    // Notification headline
    public string Title { get; set; } = string.Empty;

    // Body content
    public string Message { get; set; } = string.Empty;

    // Categorized event type
    public NotificationType Type { get; set; } = NotificationType.WorkflowStatusChanged;

    // Read status
    public bool IsRead { get; set; } = false;

    // Optional link to relevant workflow
    public Guid? RelatedWorkflowInstanceId { get; set; }
}
