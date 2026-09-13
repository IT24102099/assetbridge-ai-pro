using AssetBridge.Domain.Entities.Common;
using AssetBridge.Domain.Enums;

namespace AssetBridge.Domain.Entities.Providers;

// Represents a verified trade or specialized skill held by a contractor.
// Maps directly to IncidentCategory for automated provider matching.
public class ProviderSkill : BaseEntity
{
    public Guid ProviderId { get; set; }
    public ServiceProvider Provider { get; set; } = null!;

    public IncidentCategory Category { get; set; }
    public string SkillName { get; set; } = string.Empty;
    public int YearsOfExperience { get; set; }
    public string? LicenseNumber { get; set; }
    public bool IsPrimary { get; set; }
    public string? Notes { get; set; }
}
