using AssetBridge.Domain.Entities.Common;
using AssetBridge.Domain.Entities.Users;
using AssetBridge.Domain.Enums;

namespace AssetBridge.Domain.Entities.Incidents;

// Represents photographic, video, or document evidence attached to an incident.
// Enables the "BEFORE vs AFTER" verification workflow essential for remote owner trust.
public class IncidentEvidence : BaseEntity
{
    public Guid IncidentId { get; set; }
    public Incident Incident { get; set; } = null!;

    public Guid UploadedByUserId { get; set; }
    public User UploadedByUser { get; set; } = null!;

    public string FileUrl { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string? FileType { get; set; }
    public long FileSizeBytes { get; set; }
    public EvidenceType EvidenceType { get; set; } = EvidenceType.Photo;
    public string? Caption { get; set; }
}
