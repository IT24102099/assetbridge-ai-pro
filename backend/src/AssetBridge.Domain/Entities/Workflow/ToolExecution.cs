using AssetBridge.Domain.Entities.Common;
using AssetBridge.Domain.Enums;

namespace AssetBridge.Domain.Entities.Workflow;

// Records individual tool invocations performed by an AI Agent during an AgentRun.
// Enables strict security audits and diagnostics without logging sensitive API keys or credentials.
public class ToolExecution : BaseEntity
{
    public Guid AgentRunId { get; set; }
    public AgentRun AgentRun { get; set; } = null!;

    // Name of the allowlisted tool invoked (e.g. "CalculateProviderProximity", "CompareQuotations")
    public string ToolName { get; set; } = string.Empty;

    // Execution timing
    public DateTime StartedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAtUtc { get; set; }
    public long? DurationMs { get; set; }

    // Sanitized input parameters
    public string? InputSummary { get; set; }

    // Sanitized output result
    public string? OutputSummary { get; set; }

    // Tool execution status
    public ToolExecutionStatus Status { get; set; } = ToolExecutionStatus.Success;

    // Deterministic validation result produced by the backend rule engine
    public string? ValidationResult { get; set; }

    // Error details if tool failed or timed out
    public string? ErrorMessage { get; set; }
}
