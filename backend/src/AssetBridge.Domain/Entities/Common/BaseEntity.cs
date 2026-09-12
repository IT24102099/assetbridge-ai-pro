namespace AssetBridge.Domain.Entities.Common;

// Serves as the base class for all persistent domain entities.
// Using Guids for primary keys avoids sequential ID enumeration vulnerabilities
// and enables safe client-side or distributed ID pre-generation.
// UTC timestamps ensure consistent audit timelines across international time zones (e.g. UK vs Sri Lanka).
public abstract class BaseEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAtUtc { get; set; }
}
