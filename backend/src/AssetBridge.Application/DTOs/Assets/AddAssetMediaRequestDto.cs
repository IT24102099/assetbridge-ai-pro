using System.ComponentModel.DataAnnotations;

namespace AssetBridge.Application.DTOs.Assets;

// Carries metadata and storage reference for an uploaded asset photo/media item.
public class AddAssetMediaRequestDto
{
    [Required(ErrorMessage = "File name is required.")]
    [StringLength(255, ErrorMessage = "File name cannot exceed 255 characters.")]
    public string FileName { get; set; } = string.Empty;

    [Required(ErrorMessage = "File URL is required.")]
    [StringLength(2000, ErrorMessage = "File URL cannot exceed 2000 characters.")]
    public string FileUrl { get; set; } = string.Empty;

    [StringLength(100, ErrorMessage = "File type cannot exceed 100 characters.")]
    public string? FileType { get; set; }

    [Range(1, 10485760, ErrorMessage = "File size must be between 1 byte and 10MB (10,485,760 bytes).")]
    public long FileSizeBytes { get; set; }

    public bool IsThumbnail { get; set; }

    [StringLength(500, ErrorMessage = "Caption cannot exceed 500 characters.")]
    public string? Caption { get; set; }
}
