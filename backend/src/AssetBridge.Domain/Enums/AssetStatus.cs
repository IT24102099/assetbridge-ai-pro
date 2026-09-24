namespace AssetBridge.Domain.Enums;

// Represents the operational availability of a property asset.
// Inactive or Archived assets cannot accept new incident reports without reactivation.
public enum AssetStatus
{
    Active = 1,
    UnderMaintenance = 2,
    Archived = 3,
    Inactive = 4
}
