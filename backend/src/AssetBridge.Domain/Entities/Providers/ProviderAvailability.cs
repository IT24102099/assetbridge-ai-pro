using AssetBridge.Domain.Entities.Common;
using AssetBridge.Domain.Enums;

namespace AssetBridge.Domain.Entities.Providers;

// Represents a scheduled availability or working slot for a contractor.
// Used by the matching algorithm to ensure a recommended provider is free during the owner's deadline.
public class ProviderAvailability : BaseEntity
{
    public Guid ProviderId { get; set; }
    public ServiceProvider Provider { get; set; } = null!;

    public DateTime AvailableDateUtc { get; set; }
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }
    public AvailabilityStatus Status { get; set; } = AvailabilityStatus.Available;
    public string? Notes { get; set; }
}
