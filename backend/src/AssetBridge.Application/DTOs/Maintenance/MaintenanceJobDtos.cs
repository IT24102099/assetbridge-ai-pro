using System.ComponentModel.DataAnnotations;
using AssetBridge.Domain.Enums;

namespace AssetBridge.Application.DTOs.Maintenance;

public class CreateMaintenanceJobRequestDto
{
    [Required(ErrorMessage = "Incident ID is required.")]
    public Guid IncidentId { get; set; }

    [Required(ErrorMessage = "Provider ID is required.")]
    public Guid ProviderId { get; set; }

    public Guid? InspectionId { get; set; }

    [Required(ErrorMessage = "Title is required.")]
    [StringLength(200, MinimumLength = 3, ErrorMessage = "Title must be between 3 and 200 characters.")]
    public string Title { get; set; } = string.Empty;

    [Required(ErrorMessage = "Description is required.")]
    [StringLength(2000, ErrorMessage = "Description cannot exceed 2000 characters.")]
    public string Description { get; set; } = string.Empty;

    [Required(ErrorMessage = "Scheduled start time is required.")]
    public DateTime ScheduledStartUtc { get; set; }

    [Required(ErrorMessage = "Scheduled end time is required.")]
    public DateTime ScheduledEndUtc { get; set; }

    [Range(0, 100000000, ErrorMessage = "Approved budget must be non-negative.")]
    public decimal ApprovedBudget { get; set; }
}

public class UpdateMaintenanceJobRequestDto
{
    [Required(ErrorMessage = "Title is required.")]
    [StringLength(200, MinimumLength = 3, ErrorMessage = "Title must be between 3 and 200 characters.")]
    public string Title { get; set; } = string.Empty;

    [Required(ErrorMessage = "Description is required.")]
    [StringLength(2000, ErrorMessage = "Description cannot exceed 2000 characters.")]
    public string Description { get; set; } = string.Empty;

    [Required(ErrorMessage = "Scheduled start time is required.")]
    public DateTime ScheduledStartUtc { get; set; }

    [Required(ErrorMessage = "Scheduled end time is required.")]
    public DateTime ScheduledEndUtc { get; set; }

    [Range(0, 100000000, ErrorMessage = "Approved budget must be non-negative.")]
    public decimal ApprovedBudget { get; set; }

    [Range(0, 100000000, ErrorMessage = "Actual cost must be non-negative.")]
    public decimal? ActualCost { get; set; }

    [StringLength(1000, ErrorMessage = "Completion notes cannot exceed 1000 characters.")]
    public string? CompletionNotes { get; set; }
}

public class UpdateMaintenanceJobStatusRequestDto
{
    [Required(ErrorMessage = "Status is required.")]
    public MaintenanceJobStatus Status { get; set; }

    [Range(0, 100000000, ErrorMessage = "Actual cost must be non-negative.")]
    public decimal? ActualCost { get; set; }

    public DateTime? CompletedAtUtc { get; set; }

    [StringLength(1000, ErrorMessage = "Completion notes cannot exceed 1000 characters.")]
    public string? CompletionNotes { get; set; }
}

public class MaintenanceJobQueryParametersDto
{
    private const int MaxPageSize = 50;
    private int _pageSize = 10;

    public Guid? IncidentId { get; set; }
    public Guid? ProviderId { get; set; }
    public MaintenanceJobStatus? Status { get; set; }

    public int PageNumber { get; set; } = 1;

    public int PageSize
    {
        get => _pageSize;
        set => _pageSize = value > MaxPageSize ? MaxPageSize : (value < 1 ? 1 : value);
    }

    public string? SortBy { get; set; } = "ScheduledStartUtc";
    public bool SortDescending { get; set; } = true;
}

public class MaintenanceJobResponseDto
{
    public Guid Id { get; set; }
    public Guid IncidentId { get; set; }
    public string IncidentTitle { get; set; } = string.Empty;
    public Guid ProviderId { get; set; }
    public string ProviderBusinessName { get; set; } = string.Empty;
    public Guid? InspectionId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime ScheduledStartUtc { get; set; }
    public DateTime ScheduledEndUtc { get; set; }
    public MaintenanceJobStatus Status { get; set; }
    public string StatusName => Status.ToString();
    public decimal ApprovedBudget { get; set; }
    public decimal? ActualCost { get; set; }
    public DateTime? CompletedAtUtc { get; set; }
    public string? CompletionNotes { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
}
