using AssetBridge.Domain.Enums;

namespace AssetBridge.Application.DTOs.Incidents;

// Represents the evidence record returned to clients for inspection and verification.
public class IncidentEvidenceResponseDto
{
    public Guid Id { get; set; }
    public Guid IncidentId { get; set; }
    public Guid UploadedByUserId { get; set; }
    public string UploadedByUserName { get; set; } = string.Empty;
    public string FileUrl { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string? FileType { get; set; }
    public long FileSizeBytes { get; set; }
    public EvidenceType EvidenceType { get; set; }
    public string EvidenceTypeName => EvidenceType.ToString();
    public string? Caption { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}
