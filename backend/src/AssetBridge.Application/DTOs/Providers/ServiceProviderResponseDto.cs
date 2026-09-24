using AssetBridge.Domain.Enums;

namespace AssetBridge.Application.DTOs.Providers;

public class ServiceProviderResponseDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string BusinessName { get; set; } = string.Empty;
    public string ContactPerson { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PrimaryDistrict { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string? Address { get; set; }
    public double? BaseLatitude { get; set; }
    public double? BaseLongitude { get; set; }
    public double ServiceRadiusKm { get; set; }
    public VerificationStatus VerificationStatus { get; set; }
    public string? VerificationNotes { get; set; }
    public double Rating { get; set; }
    public int CompletedJobsCount { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }

    public ICollection<ProviderSkillResponseDto> Skills { get; set; } = new List<ProviderSkillResponseDto>();
}
