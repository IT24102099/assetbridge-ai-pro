namespace AssetBridge.Application.DTOs.Workflow;

public class WorkflowDashboardMetricsDto
{
    public int ActiveWorkflowsCount { get; set; }
    public int PendingApprovalsCount { get; set; }
    public int CompletedWorkflowsCount { get; set; }
    public int FailedWorkflowsCount { get; set; }
    public int RevisionsRequestedCount { get; set; }
    public int OverdueFollowUpsCount { get; set; }
    public int PendingFollowUpsCount { get; set; }
    public int TotalAgentRunsCount { get; set; }
    public double AverageAgentDurationMs { get; set; }
    public List<WorkflowInstanceDto> RecentWorkflows { get; set; } = new();
    public List<ApprovalRequestDto> PendingApprovals { get; set; } = new();
    public List<FollowUpTaskDto> UrgentFollowUps { get; set; } = new();
}
