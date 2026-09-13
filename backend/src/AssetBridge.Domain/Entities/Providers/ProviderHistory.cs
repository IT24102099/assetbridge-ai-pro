using AssetBridge.Domain.Entities.Common;
using AssetBridge.Domain.Enums;

namespace AssetBridge.Domain.Entities.Providers;

// Tracks contractor performance, job completion records, and feedback history.
// Provides factual data points for the Provider Intelligence matching algorithm.
public class ProviderHistory : BaseEntity
{
    public Guid ProviderId { get; set; }
    public ServiceProvider Provider { get; set; } = null!;

    public ProviderHistoryType EventType { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public double? RatingScore { get; set; }
    public Guid? RelatedIncidentId { get; set; }
}
