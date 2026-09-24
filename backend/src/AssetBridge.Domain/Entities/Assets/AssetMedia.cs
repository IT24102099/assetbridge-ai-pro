using AssetBridge.Domain.Entities.Common;
using AssetBridge.Domain.Entities.Users;

namespace AssetBridge.Domain.Entities.Assets;

// Represents photographic property media and architectural assets associated with a real estate property.
// Enforces the single-thumbnail rule per asset to designate the primary showcase image.
public class AssetMedia : BaseEntity
{
    public Guid AssetId { get; set; }
    public Asset Asset { get; set; } = null!;

    public Guid UploadedByUserId { get; set; }
    public User UploadedByUser { get; set; } = null!;

    public string FileName { get; set; } = string.Empty;
    public string FileUrl { get; set; } = string.Empty;
    public string? FileType { get; set; }
    public long FileSizeBytes { get; set; }
    public bool IsThumbnail { get; set; }
    public string? Caption { get; set; }
}
