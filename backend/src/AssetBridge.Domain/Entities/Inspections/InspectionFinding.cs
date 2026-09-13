using AssetBridge.Domain.Entities.Common;
using AssetBridge.Domain.Enums;

namespace AssetBridge.Domain.Entities.Inspections;

// Represents a discrete factual observation or defect identified during an on-site inspection.
public class InspectionFinding : BaseEntity
{
    public Guid InspectionId { get; set; }
    public Inspection Inspection { get; set; } = null!;

    public string Description { get; set; } = string.Empty;
    public FindingSeverity Severity { get; set; } = FindingSeverity.Medium;
    public string Recommendation { get; set; } = string.Empty;
    public string? EvidenceReference { get; set; }
}
