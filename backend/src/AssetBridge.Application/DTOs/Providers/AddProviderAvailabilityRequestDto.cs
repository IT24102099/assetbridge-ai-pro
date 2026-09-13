using System.ComponentModel.DataAnnotations;
using AssetBridge.Domain.Enums;

namespace AssetBridge.Application.DTOs.Providers;

public class AddProviderAvailabilityRequestDto
{
    [Required(ErrorMessage = "Available date is required.")]
    public DateTime AvailableDateUtc { get; set; }

    [Required(ErrorMessage = "Start time is required.")]
    public TimeSpan StartTime { get; set; }

    [Required(ErrorMessage = "End time is required.")]
    public TimeSpan EndTime { get; set; }

    public AvailabilityStatus Status { get; set; } = AvailabilityStatus.Available;

    [StringLength(500, ErrorMessage = "Notes cannot exceed 500 characters.")]
    public string? Notes { get; set; }
}

public class UpdateProviderAvailabilityRequestDto
{
    [Required(ErrorMessage = "Available date is required.")]
    public DateTime AvailableDateUtc { get; set; }

    [Required(ErrorMessage = "Start time is required.")]
    public TimeSpan StartTime { get; set; }

    [Required(ErrorMessage = "End time is required.")]
    public TimeSpan EndTime { get; set; }

    public AvailabilityStatus Status { get; set; } = AvailabilityStatus.Available;

    [StringLength(500, ErrorMessage = "Notes cannot exceed 500 characters.")]
    public string? Notes { get; set; }
}
