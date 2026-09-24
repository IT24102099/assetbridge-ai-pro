using AssetBridge.Domain.Entities.Common;
using AssetBridge.Domain.Entities.Incidents;
using AssetBridge.Domain.Entities.Users;
using AssetBridge.Domain.Enums;

namespace AssetBridge.Domain.Entities.Assets;

// Root aggregate entity representing a residential or commercial property in Sri Lanka.
// Serves as the anchor for property continuity history, incidents, inspections, and contractor matching.
public class Asset : BaseEntity
{
    // Identifies the authenticated owner; enforced server-side to prevent unauthorized access across owners
    public Guid OwnerId { get; set; }
    public User Owner { get; set; } = null!;

    public string Name { get; set; } = string.Empty;
    public PropertyType PropertyType { get; set; }
    public string AddressLine1 { get; set; } = string.Empty;
    public string? AddressLine2 { get; set; }
    public string City { get; set; } = string.Empty;
    public string District { get; set; } = string.Empty;
    public string? PostalCode { get; set; }

    // Coordinates enable distance calculation for Provider Intelligence (Member 2)
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }

    public string? Description { get; set; }
    public AssetStatus Status { get; set; } = AssetStatus.Active;

    // Navigation collections representing the life cycle and business history of the property
    public ICollection<AssetMedia> Media { get; set; } = new List<AssetMedia>();
    public ICollection<Incident> Incidents { get; set; } = new List<Incident>();
    public ICollection<AssetHistory> HistoryEntries { get; set; } = new List<AssetHistory>();
}
