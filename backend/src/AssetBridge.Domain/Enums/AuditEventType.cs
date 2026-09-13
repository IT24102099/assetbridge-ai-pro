namespace AssetBridge.Domain.Enums;

// Categorizes immutable audit log records across workflow, AI governance, and security actions.
public enum AuditEventType
{
    WorkflowCreated = 1,
    WorkflowStateChanged = 2,
    AiPlanCreated = 3,
    ProviderRecommended = 4,
    QuotationCompared = 5,
    ApprovalRequested = 6,
    ApprovalApproved = 7,
    ApprovalRejected = 8,
    RevisionRequested = 9,
    ExecutionStarted = 10,
    ExecutionCompleted = 11,
    WorkflowFailed = 12,
    FollowUpCreated = 13,
    SecurityEvent = 14
}
