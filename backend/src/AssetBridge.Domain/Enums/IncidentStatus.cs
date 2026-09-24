namespace AssetBridge.Domain.Enums;

// Represents the lifecycle status of an individual incident report.
// Provides structured states that integrate cleanly with Member 4's master workflow engine.
public enum IncidentStatus
{
    Reported = 1,
    Validating = 2,
    Planning = 3,
    ProviderSelection = 4,
    InspectionPending = 5,
    WorkInProgress = 6,
    Resolved = 7,
    Closed = 8,
    Cancelled = 9
}
