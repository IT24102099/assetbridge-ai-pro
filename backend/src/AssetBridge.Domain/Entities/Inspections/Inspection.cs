using AssetBridge.Domain.Entities.Common;
using AssetBridge.Domain.Entities.Incidents;
using AssetBridge.Domain.Entities.Providers;
using AssetBridge.Domain.Enums;

namespace AssetBridge.Domain.Entities.Inspections;

// Represents an on-site physical or technical assessment of an incident/property problem.
public class Inspection : BaseEntity
{
    public Guid IncidentId { get; set; }
    public Incident Incident { get; set; } = null!;

    public Guid InspectorProviderId { get; set; }
    public ServiceProvider InspectorProvider { get; set; } = null!;

    public DateTime ScheduledAtUtc { get; set; }
    public DateTime? CompletedAtUtc { get; set; }
    public InspectionStatus Status { get; set; } = InspectionStatus.Scheduled;

    public string? Summary { get; set; }
    public string? Notes { get; set; }
    public FindingSeverity? EstimatedSeverity { get; set; }

    public ICollection<InspectionFinding> Findings { get; set; } = new List<InspectionFinding>();
}
