namespace AssetBridge.Domain.Enums;

// Identifies historical performance milestones recorded for a service contractor.
// Feeds into the Provider Intelligence rating and matching algorithm.
public enum ProviderHistoryType
{
    JobCompleted = 1,
    InspectionCompleted = 2,
    FeedbackReceived = 3,
    VerificationUpdated = 4,
    DisputeLogged = 5
}
