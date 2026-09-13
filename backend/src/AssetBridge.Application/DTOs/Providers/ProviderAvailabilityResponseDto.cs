using AssetBridge.Domain.Enums;

namespace AssetBridge.Application.DTOs.Providers;

public class ProviderAvailabilityResponseDto
{
    public Guid Id { get; set; }
    public Guid ProviderId { get; set; }
    public DateTime AvailableDateUtc { get; set; }
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }
    public AvailabilityStatus Status { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}
