using AssetBridge.Domain.Entities.Assets;
using AssetBridge.Domain.Entities.Common;
using AssetBridge.Domain.Entities.Incidents;
using AssetBridge.Domain.Enums;

namespace AssetBridge.Domain.Entities.Maintenance;

// Tracks property-centric business maintenance milestones, historical costs, and repairs.
public class MaintenanceHistory : BaseEntity
{
    public Guid AssetId { get; set; }
    public Asset Asset { get; set; } = null!;

    public Guid? IncidentId { get; set; }
    public Incident? Incident { get; set; }

    public Guid? MaintenanceJobId { get; set; }
    public MaintenanceJob? MaintenanceJob { get; set; }

    public MaintenanceHistoryEventType EventType { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal? RecordedCost { get; set; }
    public Guid RecordedByUserId { get; set; }
}
