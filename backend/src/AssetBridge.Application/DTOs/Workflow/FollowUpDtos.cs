using AssetBridge.Domain.Enums;

namespace AssetBridge.Application.DTOs.Workflow;

public class FollowUpTaskDto
{
    public Guid Id { get; set; }
    public Guid? WorkflowInstanceId { get; set; }
    public Guid AssetId { get; set; }
    public string AssetName { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime DueDateUtc { get; set; }
    public FollowUpStatus Status { get; set; }
    public string StatusName { get; set; } = string.Empty;
    public FollowUpPriority Priority { get; set; }
    public string PriorityName { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? CompletedAtUtc { get; set; }
    public Guid? AssignedToUserId { get; set; }
    public string? AssignedToUserName { get; set; }
    public bool IsOverdue => Status != FollowUpStatus.Completed && Status != FollowUpStatus.Cancelled && DueDateUtc < DateTime.UtcNow;
}

public class CreateFollowUpTaskDto
{
    public Guid? WorkflowInstanceId { get; set; }
    public Guid AssetId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime DueDateUtc { get; set; }
    public FollowUpPriority Priority { get; set; } = FollowUpPriority.Medium;
    public Guid? AssignedToUserId { get; set; }
}

public class UpdateFollowUpStatusDto
{
    public FollowUpStatus Status { get; set; }
    public string? ResolutionNotes { get; set; }
}

public class FollowUpFilterParametersDto
{
    public Guid? AssetId { get; set; }
    public Guid? WorkflowInstanceId { get; set; }
    public FollowUpStatus? Status { get; set; }
    public FollowUpPriority? Priority { get; set; }
    public bool? IsOverdue { get; set; }
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}
