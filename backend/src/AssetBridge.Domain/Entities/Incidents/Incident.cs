using AssetBridge.Domain.Entities.Assets;
using AssetBridge.Domain.Entities.Common;
using AssetBridge.Domain.Entities.Users;
using AssetBridge.Domain.Enums;

namespace AssetBridge.Domain.Entities.Incidents;

// Represents an owner or representative-reported maintenance problem for an Asset.
// Contains categorization and priority used by the Incident Planning Agent (Member 1 AI).
public class Incident : BaseEntity
{
    public Guid AssetId { get; set; }
    public Asset Asset { get; set; } = null!;

    public Guid ReportedByUserId { get; set; }
    public User ReportedByUser { get; set; } = null!;

    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public IncidentCategory Category { get; set; } = IncidentCategory.General;
    public IncidentPriority Priority { get; set; } = IncidentPriority.Medium;
    public IncidentStatus Status { get; set; } = IncidentStatus.Reported;

    // Optional owner's maximum allowable budget in Sri Lankan Rupees (LKR)
    public decimal? EstimatedBudget { get; set; }

    // Target completion or inspection date desired by overseas owner
    public DateTime? RequiredByUtc { get; set; }

    // Specific room/location within property (e.g., "Ground floor kitchen sink")
    public string? LocationDetails { get; set; }

    // Physical proof, photos, and inspection attachments
    public ICollection<IncidentEvidence> EvidenceItems { get; set; } = new List<IncidentEvidence>();
}
