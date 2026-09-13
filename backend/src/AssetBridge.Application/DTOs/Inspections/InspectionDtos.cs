using System.ComponentModel.DataAnnotations;
using AssetBridge.Domain.Enums;

namespace AssetBridge.Application.DTOs.Inspections;

public class CreateInspectionRequestDto
{
    [Required(ErrorMessage = "Incident ID is required.")]
    public Guid IncidentId { get; set; }

    [Required(ErrorMessage = "Inspector/Provider ID is required.")]
    public Guid InspectorProviderId { get; set; }

    [Required(ErrorMessage = "Scheduled inspection time is required.")]
    public DateTime ScheduledAtUtc { get; set; }

    [StringLength(1000, ErrorMessage = "Notes cannot exceed 1000 characters.")]
    public string? Notes { get; set; }
}

public class UpdateInspectionRequestDto
{
    [Required(ErrorMessage = "Scheduled inspection time is required.")]
    public DateTime ScheduledAtUtc { get; set; }

    public DateTime? CompletedAtUtc { get; set; }

    [StringLength(1000, ErrorMessage = "Summary cannot exceed 1000 characters.")]
    public string? Summary { get; set; }

    [StringLength(1000, ErrorMessage = "Notes cannot exceed 1000 characters.")]
    public string? Notes { get; set; }

    public FindingSeverity? EstimatedSeverity { get; set; }
}

public class UpdateInspectionStatusRequestDto
{
    [Required(ErrorMessage = "Status is required.")]
    public InspectionStatus Status { get; set; }

    public DateTime? CompletedAtUtc { get; set; }

    [StringLength(1000, ErrorMessage = "Summary cannot exceed 1000 characters.")]
    public string? Summary { get; set; }
}

public class InspectionQueryParametersDto
{
    private const int MaxPageSize = 50;
    private int _pageSize = 10;

    public Guid? IncidentId { get; set; }
    public Guid? InspectorProviderId { get; set; }
    public InspectionStatus? Status { get; set; }

    public int PageNumber { get; set; } = 1;

    public int PageSize
    {
        get => _pageSize;
        set => _pageSize = value > MaxPageSize ? MaxPageSize : (value < 1 ? 1 : value);
    }

    public string? SortBy { get; set; } = "ScheduledAtUtc";
    public bool SortDescending { get; set; } = true;
}

public class InspectionResponseDto
{
    public Guid Id { get; set; }
    public Guid IncidentId { get; set; }
    public string IncidentTitle { get; set; } = string.Empty;
    public Guid InspectorProviderId { get; set; }
    public string InspectorBusinessName { get; set; } = string.Empty;
    public DateTime ScheduledAtUtc { get; set; }
    public DateTime? CompletedAtUtc { get; set; }
    public InspectionStatus Status { get; set; }
    public string StatusName => Status.ToString();
    public string? Summary { get; set; }
    public string? Notes { get; set; }
    public FindingSeverity? EstimatedSeverity { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }

    public ICollection<InspectionFindingResponseDto> Findings { get; set; } = new List<InspectionFindingResponseDto>();
}
