using AssetBridge.Domain.Entities.Common;

namespace AssetBridge.Domain.Entities.Maintenance;

// Represents a line item inside a contractor quotation (materials, labor, specialized services).
public class QuotationItem : BaseEntity
{
    public Guid QuotationId { get; set; }
    public Quotation Quotation { get; set; } = null!;

    public string Description { get; set; } = string.Empty;
    public decimal Quantity { get; set; } = 1;
    public decimal UnitPrice { get; set; }
    public decimal TotalPrice { get; set; }
}
