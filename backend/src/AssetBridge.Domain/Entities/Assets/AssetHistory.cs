using AssetBridge.Domain.Entities.Common;
using AssetBridge.Domain.Entities.Users;
using AssetBridge.Domain.Enums;

namespace AssetBridge.Domain.Entities.Assets;

// Captures key property lifecycle events into an immutable digital timeline.
// Enables overseas owners to inspect the historical progression of maintenance and incidents on their property.
public class AssetHistory : BaseEntity
{
    public Guid AssetId { get; set; }
    public Asset Asset { get; set; } = null!;

    public Guid? PerformedByUserId { get; set; }
    public User? PerformedByUser { get; set; }

    public AssetHistoryEventType EventType { get; set; }
    public string EventTitle { get; set; } = string.Empty;
    public string EventDescription { get; set; } = string.Empty;

    // Optional link to the specific incident that produced this history item
    public Guid? RelatedIncidentId { get; set; }
}
