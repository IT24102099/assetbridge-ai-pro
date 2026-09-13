using System.ComponentModel.DataAnnotations;
using AssetBridge.Domain.Enums;

namespace AssetBridge.Application.DTOs.Incidents;

// Carries the maintenance issue details submitted by an owner or representative.
public class CreateIncidentRequestDto
{
    [Required(ErrorMessage = "Asset ID is required.")]
    public Guid AssetId { get; set; }

    [Required(ErrorMessage = "Incident title is required.")]
    [StringLength(200, MinimumLength = 5, ErrorMessage = "Title must be between 5 and 200 characters.")]
    public string Title { get; set; } = string.Empty;

    [Required(ErrorMessage = "Description is required.")]
    [StringLength(4000, MinimumLength = 10, ErrorMessage = "Description must provide sufficient detail (10 to 4000 characters).")]
    public string Description { get; set; } = string.Empty;

    [Required(ErrorMessage = "Category is required.")]
    public IncidentCategory Category { get; set; }

    [Required(ErrorMessage = "Priority is required.")]
    public IncidentPriority Priority { get; set; }

    [Range(0, 100000000, ErrorMessage = "Estimated budget cannot be negative.")]
    public decimal? EstimatedBudget { get; set; }

    public DateTime? RequiredByUtc { get; set; }

    [StringLength(250, ErrorMessage = "Location details cannot exceed 250 characters.")]
    public string? LocationDetails { get; set; }
}
