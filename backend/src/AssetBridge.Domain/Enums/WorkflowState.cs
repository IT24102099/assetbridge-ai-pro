namespace AssetBridge.Domain.Enums;

// Defines the 15 deterministic states in the AssetBridge AI workflow state machine.
// Arbitrary state jumps are strictly prohibited; all state transitions must obey
// legal transition pathways enforced by the backend workflow engine.
public enum WorkflowState
{
    Created = 1,
    Planning = 2,
    ProviderSelection = 3,
    InspectionPending = 4,
    QuotationReview = 5,
    AiValidation = 6,
    AwaitingApproval = 7,
    RevisionRequested = 8,
    Approved = 9,
    Rejected = 10,
    Execution = 11,
    CompletionReview = 12,
    Completed = 13,
    FollowUp = 14,
    Failed = 15
}
