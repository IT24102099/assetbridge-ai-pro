namespace AssetBridge.Domain.Enums;

// The decision made by an authorized human approver (Manager / Admin).
public enum ApprovalDecision
{
    Approve = 1,
    Reject = 2,
    RequestRevision = 3
}
