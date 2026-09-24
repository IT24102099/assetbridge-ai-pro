using AssetBridge.Domain.Enums;

namespace AssetBridge.Application.DTOs.Providers;

public class ProviderSkillResponseDto
{
    public Guid Id { get; set; }
    public Guid ProviderId { get; set; }
    public IncidentCategory Category { get; set; }
    public string SkillName { get; set; } = string.Empty;
    public int YearsOfExperience { get; set; }
    public string? LicenseNumber { get; set; }
    public bool IsPrimary { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}
