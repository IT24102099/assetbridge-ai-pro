namespace AssetBridge.Domain.Enums;

// Distinguishes business events logged in the Property Continuity Timeline (AssetHistory).
// Note: This is separate from technical system audit logs (AuditEvents) managed by Member 4.
public enum AssetHistoryEventType
{
    AssetCreated = 1,
    AssetUpdated = 2,
    IncidentReported = 3,
    IncidentStatusChanged = 4,
    EvidenceAdded = 5,
    AssetArchived = 6,
    AssetReactivated = 7
}
