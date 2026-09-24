using System.ComponentModel.DataAnnotations;
using AssetBridge.Domain.Enums;

namespace AssetBridge.Application.DTOs.Inspections;

public class CreateInspectionFindingRequestDto
{
    [Required(ErrorMessage = "Description is required.")]
    [StringLength(1000, MinimumLength = 5, ErrorMessage = "Description must be between 5 and 1000 characters.")]
    public string Description { get; set; } = string.Empty;

    public FindingSeverity Severity { get; set; } = FindingSeverity.Medium;

    [Required(ErrorMessage = "Recommendation is required.")]
    [StringLength(1000, MinimumLength = 5, ErrorMessage = "Recommendation must be between 5 and 1000 characters.")]
    public string Recommendation { get; set; } = string.Empty;

    [StringLength(500, ErrorMessage = "Evidence reference cannot exceed 500 characters.")]
    public string? EvidenceReference { get; set; }
}

public class UpdateInspectionFindingRequestDto
{
    [Required(ErrorMessage = "Description is required.")]
    [StringLength(1000, MinimumLength = 5, ErrorMessage = "Description must be between 5 and 1000 characters.")]
    public string Description { get; set; } = string.Empty;

    public FindingSeverity Severity { get; set; } = FindingSeverity.Medium;

    [Required(ErrorMessage = "Recommendation is required.")]
    [StringLength(1000, MinimumLength = 5, ErrorMessage = "Recommendation must be between 5 and 1000 characters.")]
    public string Recommendation { get; set; } = string.Empty;

    [StringLength(500, ErrorMessage = "Evidence reference cannot exceed 500 characters.")]
    public string? EvidenceReference { get; set; }
}

public class InspectionFindingResponseDto
{
    public Guid Id { get; set; }
    public Guid InspectionId { get; set; }
    public string Description { get; set; } = string.Empty;
    public FindingSeverity Severity { get; set; }
    public string SeverityName => Severity.ToString();
    public string Recommendation { get; set; } = string.Empty;
    public string? EvidenceReference { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}
