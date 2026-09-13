namespace AssetBridge.Domain.Enums;

// Execution status of an autonomous agent execution cycle.
public enum AgentRunStatus
{
    Pending = 1,
    Running = 2,
    Completed = 3,
    Failed = 4,
    Cancelled = 5
}
