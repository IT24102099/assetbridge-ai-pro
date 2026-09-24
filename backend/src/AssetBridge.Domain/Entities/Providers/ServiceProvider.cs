using AssetBridge.Domain.Entities.Common;
using AssetBridge.Domain.Entities.Users;
using AssetBridge.Domain.Enums;

namespace AssetBridge.Domain.Entities.Providers;

// Represents a professional contractor or technician operating in Sri Lanka (e.g. Plumber, Electrician).
// Anchors skills, operating location, availability schedules, and performance history.
public class ServiceProvider : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public string BusinessName { get; set; } = string.Empty;
    public string ContactPerson { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PrimaryDistrict { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string? Address { get; set; }

    // Coordinates enable accurate Haversine distance calculation relative to properties
    public double? BaseLatitude { get; set; }
    public double? BaseLongitude { get; set; }

    // Maximum operating radius in kilometers (default: 30 km)
    public double ServiceRadiusKm { get; set; } = 30.0;

    public VerificationStatus VerificationStatus { get; set; } = VerificationStatus.Pending;
    public string? VerificationNotes { get; set; }

    // Performance indicators
    public double Rating { get; set; } = 5.0;
    public int CompletedJobsCount { get; set; }
    public bool IsActive { get; set; } = true;

    // Navigation collections
    public ICollection<ProviderSkill> Skills { get; set; } = new List<ProviderSkill>();
    public ICollection<ProviderAvailability> AvailabilitySlots { get; set; } = new List<ProviderAvailability>();
    public ICollection<ProviderHistory> HistoryEntries { get; set; } = new List<ProviderHistory>();
}
