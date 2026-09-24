using System.ComponentModel.DataAnnotations;
using AssetBridge.Domain.Enums;

namespace AssetBridge.Application.DTOs.Providers;

public class AddProviderSkillRequestDto
{
    [Required(ErrorMessage = "Incident category is required.")]
    public IncidentCategory Category { get; set; }

    [Required(ErrorMessage = "Skill name is required.")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Skill name must be between 2 and 100 characters.")]
    public string SkillName { get; set; } = string.Empty;

    [Range(0, 70, ErrorMessage = "Years of experience must be between 0 and 70.")]
    public int YearsOfExperience { get; set; }

    [StringLength(100, ErrorMessage = "License number cannot exceed 100 characters.")]
    public string? LicenseNumber { get; set; }

    public bool IsPrimary { get; set; }

    [StringLength(500, ErrorMessage = "Notes cannot exceed 500 characters.")]
    public string? Notes { get; set; }
}
