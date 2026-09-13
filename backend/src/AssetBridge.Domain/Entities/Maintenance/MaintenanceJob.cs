using AssetBridge.Domain.Entities.Common;
using AssetBridge.Domain.Entities.Incidents;
using AssetBridge.Domain.Entities.Inspections;
using AssetBridge.Domain.Entities.Providers;
using AssetBridge.Domain.Enums;

namespace AssetBridge.Domain.Entities.Maintenance;

// Represents planned or executed physical repair/maintenance work for an Incident.
public class MaintenanceJob : BaseEntity
{
    public Guid IncidentId { get; set; }
    public Incident Incident { get; set; } = null!;

    public Guid ProviderId { get; set; }
    public ServiceProvider Provider { get; set; } = null!;

    public Guid? InspectionId { get; set; }
    public Inspection? Inspection { get; set; }

    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;

    public DateTime ScheduledStartUtc { get; set; }
    public DateTime ScheduledEndUtc { get; set; }

    public MaintenanceJobStatus Status { get; set; } = MaintenanceJobStatus.Planned;

    public decimal ApprovedBudget { get; set; }
    public decimal? ActualCost { get; set; }
    public DateTime? CompletedAtUtc { get; set; }
    public string? CompletionNotes { get; set; }
}
