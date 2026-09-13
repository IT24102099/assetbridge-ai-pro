namespace AssetBridge.Domain.Enums;

// Indicates the execution status of an individual step in the workflow timeline.
public enum WorkflowStepStatus
{
    InProgress = 1,
    Completed = 2,
    Failed = 3,
    Skipped = 4
}
