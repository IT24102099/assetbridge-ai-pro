using AssetBridge.Domain.Enums;

namespace AssetBridge.Application.DTOs.Workflow;

public class AgentRunDto
{
    public Guid Id { get; set; }
    public Guid WorkflowInstanceId { get; set; }
    public string AgentName { get; set; } = string.Empty;
    public AgentType AgentType { get; set; }
    public string AgentTypeName { get; set; } = string.Empty;
    public AgentRunStatus Status { get; set; }
    public string StatusName { get; set; } = string.Empty;
    public DateTime StartedAtUtc { get; set; }
    public DateTime? CompletedAtUtc { get; set; }
    public long? DurationMs { get; set; }
    public string? InputSummary { get; set; }
    public string? OutputSummary { get; set; }
    public string? ErrorMessage { get; set; }
    public int RetryCount { get; set; }
    public string CorrelationId { get; set; } = string.Empty;
    public List<ToolExecutionDto> ToolExecutions { get; set; } = new();
}

public class CreateAgentRunDto
{
    public string AgentName { get; set; } = string.Empty;
    public AgentType AgentType { get; set; }
    public string? InputSummary { get; set; }
    public string? CorrelationId { get; set; }
}

public class CompleteAgentRunDto
{
    public AgentRunStatus Status { get; set; } = AgentRunStatus.Completed;
    public string? OutputSummary { get; set; }
    public string? ErrorMessage { get; set; }
}

public class ToolExecutionDto
{
    public Guid Id { get; set; }
    public Guid AgentRunId { get; set; }
    public string ToolName { get; set; } = string.Empty;
    public DateTime StartedAtUtc { get; set; }
    public DateTime? CompletedAtUtc { get; set; }
    public long? DurationMs { get; set; }
    public string? InputSummary { get; set; }
    public string? OutputSummary { get; set; }
    public ToolExecutionStatus Status { get; set; }
    public string StatusName { get; set; } = string.Empty;
    public string? ValidationResult { get; set; }
    public string? ErrorMessage { get; set; }
}

public class CreateToolExecutionDto
{
    public string ToolName { get; set; } = string.Empty;
    public string? InputSummary { get; set; }
    public string? OutputSummary { get; set; }
    public ToolExecutionStatus Status { get; set; } = ToolExecutionStatus.Success;
    public string? ValidationResult { get; set; }
    public string? ErrorMessage { get; set; }
    public long? DurationMs { get; set; }
}
