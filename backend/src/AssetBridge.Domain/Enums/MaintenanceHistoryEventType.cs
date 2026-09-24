namespace AssetBridge.Domain.Enums;

public enum MaintenanceHistoryEventType
{
    JobCreated = 1,
    JobScheduled = 2,
    JobStarted = 3,
    JobCompleted = 4,
    CostRecorded = 5,
    WarrantyLogged = 6
}
