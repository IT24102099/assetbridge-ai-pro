using AssetBridge.Domain.Entities.Common;
using AssetBridge.Domain.Enums;

namespace AssetBridge.Domain.Entities.Workflow;

// Records the autonomous execution trace of an Agentic AI agent.
// Provides observability into agent reasoning duration, tool calls, and error tracking.
public class AgentRun : BaseEntity
{
    public Guid WorkflowInstanceId { get; set; }
    public WorkflowInstance WorkflowInstance { get; set; } = null!;

    // Human-readable agent identifier (e.g. "Incident Planning Agent")
    public string AgentName { get; set; } = string.Empty;

    // Categorized agent specialization
    public AgentType AgentType { get; set; }

    // Run execution status
    public AgentRunStatus Status { get; set; } = AgentRunStatus.Pending;

    // Execution timing
    public DateTime StartedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAtUtc { get; set; }
    public long? DurationMs { get; set; }

    // High-level sanitized summary of prompt inputs (secrets omitted)
    public string? InputSummary { get; set; }

    // High-level summary of agent plan / recommendation
    public string? OutputSummary { get; set; }

    // Error details if agent encountered tool failure or timeout
    public string? ErrorMessage { get; set; }

    // Number of retry attempts executed
    public int RetryCount { get; set; } = 0;

    // Correlation ID matching the overall workflow
    public string CorrelationId { get; set; } = string.Empty;

    // Controlled tool executions invoked during this agent run
    public ICollection<ToolExecution> ToolExecutions { get; set; } = new List<ToolExecution>();
}
