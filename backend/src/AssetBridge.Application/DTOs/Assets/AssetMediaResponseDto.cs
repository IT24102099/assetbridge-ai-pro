namespace AssetBridge.Application.DTOs.Assets;

// Represents the sanitized asset media record returned across REST endpoints.
public class AssetMediaResponseDto
{
    public Guid Id { get; set; }
    public Guid AssetId { get; set; }
    public Guid UploadedByUserId { get; set; }
    public string UploadedByUserName { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string FileUrl { get; set; } = string.Empty;
    public string? FileType { get; set; }
    public long FileSizeBytes { get; set; }
    public bool IsThumbnail { get; set; }
    public string? Caption { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}
