using System.ComponentModel.DataAnnotations;

namespace AssetBridge.Application.DTOs.Representatives;

public class RepresentativeDocumentResponseDto
{
    public Guid Id { get; set; }
    public Guid RepresentativeId { get; set; }
    public string DocumentType { get; set; } = string.Empty;
    public string DocumentTypeName { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string FileUrl { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public string ContentType { get; set; } = string.Empty;
    public string Status { get; set; } = "Pending Review";
    public string? ReviewerNotes { get; set; }
    public string? ReviewedBy { get; set; }
    public DateTime UploadedAtUtc { get; set; }
    public DateTime? ReviewedAtUtc { get; set; }
}

public class ReviewRepresentativeDocumentRequestDto
{
    [Required(ErrorMessage = "Verification decision is required.")]
    public string Status { get; set; } = "Verified";

    [StringLength(500, ErrorMessage = "Review notes cannot exceed 500 characters.")]
    public string? Notes { get; set; }
}
