using AssetBridge.Domain.Enums;

namespace AssetBridge.Application.DTOs.Incidents;

// Represents the full incident details returned to web and mobile clients.
public class IncidentResponseDto
{
    public Guid Id { get; set; }
    public Guid AssetId { get; set; }
    public string AssetName { get; set; } = string.Empty;
    public string AssetCity { get; set; } = string.Empty;
    public Guid ReportedByUserId { get; set; }
    public string ReportedByUserName { get; set; } = string.Empty;
    public string ReportedByUserEmail { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public IncidentCategory Category { get; set; }
    public string CategoryName => Category.ToString();
    public IncidentPriority Priority { get; set; }
    public string PriorityName => Priority.ToString();
    public IncidentStatus Status { get; set; }
    public string StatusName => Status.ToString();
    public decimal? EstimatedBudget { get; set; }
    public DateTime? RequiredByUtc { get; set; }
    public string? LocationDetails { get; set; }
    public int EvidenceCount { get; set; }
    public List<IncidentEvidenceResponseDto> Evidence { get; set; } = new();
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
}
