using AssetBridge.Domain.Enums;

namespace AssetBridge.Application.DTOs.Assets;

// Represents a historical milestone in the property continuity timeline.
public class AssetHistoryResponseDto
{
    public Guid Id { get; set; }
    public Guid AssetId { get; set; }
    public Guid? PerformedByUserId { get; set; }
    public string? PerformedByUserName { get; set; }
    public AssetHistoryEventType EventType { get; set; }
    public string EventTypeName => EventType.ToString();
    public string EventTitle { get; set; } = string.Empty;
    public string EventDescription { get; set; } = string.Empty;
    public Guid? RelatedIncidentId { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}
