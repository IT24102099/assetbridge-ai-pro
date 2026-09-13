using AssetBridge.Domain.Enums;

namespace AssetBridge.Application.DTOs.Assets;

// Represents the sanitized asset information returned across REST endpoints.
public class AssetResponseDto
{
    public Guid Id { get; set; }
    public Guid OwnerId { get; set; }
    public string OwnerName { get; set; } = string.Empty;
    public string OwnerEmail { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public PropertyType PropertyType { get; set; }
    public string PropertyTypeName => PropertyType.ToString();
    public string AddressLine1 { get; set; } = string.Empty;
    public string? AddressLine2 { get; set; }
    public string City { get; set; } = string.Empty;
    public string District { get; set; } = string.Empty;
    public string? PostalCode { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? Description { get; set; }
    public AssetStatus Status { get; set; }
    public string StatusName => Status.ToString();
    public int ActiveIncidentCount { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
}
