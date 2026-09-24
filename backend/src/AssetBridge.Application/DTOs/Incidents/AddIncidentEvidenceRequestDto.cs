using System.ComponentModel.DataAnnotations;
using AssetBridge.Domain.Enums;

namespace AssetBridge.Application.DTOs.Incidents;

// Carries metadata and storage reference for an uploaded evidence item (photo/doc).
public class AddIncidentEvidenceRequestDto
{
    [Required(ErrorMessage = "File URL is required.")]
    [Url(ErrorMessage = "Please provide a valid file URL or relative storage URI.")]
    public string FileUrl { get; set; } = string.Empty;

    [Required(ErrorMessage = "File name is required.")]
    [StringLength(255, ErrorMessage = "File name cannot exceed 255 characters.")]
    public string FileName { get; set; } = string.Empty;

    public string? FileType { get; set; }

    [Range(1, 104857600, ErrorMessage = "File size must be greater than 0 and less than 100MB.")]
    public long FileSizeBytes { get; set; }

    [Required(ErrorMessage = "Evidence type is required.")]
    public EvidenceType EvidenceType { get; set; } = EvidenceType.Photo;

    [StringLength(500, ErrorMessage = "Caption cannot exceed 500 characters.")]
    public string? Caption { get; set; }
}
