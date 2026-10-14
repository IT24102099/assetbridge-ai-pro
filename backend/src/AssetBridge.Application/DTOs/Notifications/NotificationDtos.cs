using System;
using AssetBridge.Domain.Enums;

namespace AssetBridge.Application.DTOs.Notifications;

public class NotificationDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public NotificationType Type { get; set; }
    public string TypeName { get; set; } = string.Empty;
    public bool IsRead { get; set; }
    public Guid? RelatedWorkflowInstanceId { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}

public class CreateNotificationDto
{
    public Guid UserId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public NotificationType Type { get; set; } = NotificationType.WorkflowStatusChanged;
    public Guid? RelatedWorkflowInstanceId { get; set; }
}
