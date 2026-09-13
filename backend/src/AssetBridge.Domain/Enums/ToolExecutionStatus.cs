namespace AssetBridge.Domain.Enums;

// Status of a tool invoked by an agent during its execution.
public enum ToolExecutionStatus
{
    Success = 1,
    Failed = 2,
    Blocked = 3,
    Timeout = 4
}
