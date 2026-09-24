using AssetBridge.Domain.Entities.Common;
using AssetBridge.Domain.Entities.Incidents;
using AssetBridge.Domain.Entities.Providers;
using AssetBridge.Domain.Enums;

namespace AssetBridge.Domain.Entities.Maintenance;

// Represents a formal contractor quotation submitted for an incident or maintenance job.
public class Quotation : BaseEntity
{
    public Guid IncidentId { get; set; }
    public Incident Incident { get; set; } = null!;

    public Guid ProviderId { get; set; }
    public ServiceProvider Provider { get; set; } = null!;

    public DateTime ValidUntilUtc { get; set; }
    public string? Notes { get; set; }

    public decimal Subtotal { get; set; }
    public decimal TaxAndOtherCharges { get; set; }
    public decimal TotalAmount { get; set; }

    public QuotationStatus Status { get; set; } = QuotationStatus.Draft;

    public ICollection<QuotationItem> Items { get; set; } = new List<QuotationItem>();
}
