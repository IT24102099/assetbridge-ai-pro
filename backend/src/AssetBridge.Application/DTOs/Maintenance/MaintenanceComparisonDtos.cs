using System.ComponentModel.DataAnnotations;
using AssetBridge.Domain.Enums;

namespace AssetBridge.Application.DTOs.Maintenance;

public class MaintenanceHistoryResponseDto
{
    public Guid Id { get; set; }
    public Guid AssetId { get; set; }
    public Guid? IncidentId { get; set; }
    public Guid? MaintenanceJobId { get; set; }
    public MaintenanceHistoryEventType EventType { get; set; }
    public string EventTypeName => EventType.ToString();
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal? RecordedCost { get; set; }
    public Guid RecordedByUserId { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}

public class RecordMaintenanceHistoryRequestDto
{
    [Required(ErrorMessage = "Asset ID is required.")]
    public Guid AssetId { get; set; }

    public Guid? IncidentId { get; set; }
    public Guid? MaintenanceJobId { get; set; }

    [Required(ErrorMessage = "Event type is required.")]
    public MaintenanceHistoryEventType EventType { get; set; }

    [Required(ErrorMessage = "Title is required.")]
    [StringLength(200, MinimumLength = 2, ErrorMessage = "Title must be between 2 and 200 characters.")]
    public string Title { get; set; } = string.Empty;

    [Required(ErrorMessage = "Description is required.")]
    [StringLength(1000, ErrorMessage = "Description cannot exceed 1000 characters.")]
    public string Description { get; set; } = string.Empty;

    [Range(0, 100000000, ErrorMessage = "Cost must be non-negative.")]
    public decimal? RecordedCost { get; set; }
}

public class BudgetCheckRequestDto
{
    public Guid? IncidentId { get; set; }
    public Guid? QuotationId { get; set; }

    [Range(0, 100000000, ErrorMessage = "Estimated budget must be non-negative.")]
    public decimal? EstimatedBudget { get; set; }

    [Range(0, 100000000, ErrorMessage = "Quotation amount must be non-negative.")]
    public decimal? QuotationAmount { get; set; }
}

public class BudgetCheckResultDto
{
    public Guid? IncidentId { get; set; }
    public Guid? QuotationId { get; set; }
    public decimal EstimatedBudget { get; set; }
    public decimal QuotationAmount { get; set; }
    public decimal DifferenceAmount { get; set; } // EstimatedBudget - QuotationAmount (positive = under budget, negative = over budget)
    public bool IsWithinBudget { get; set; }
    public double BudgetUtilizationPercentage { get; set; }
    public string Explanation { get; set; } = string.Empty;
}

public class QuotationComparisonRequestDto
{
    [Required(ErrorMessage = "Incident ID is required.")]
    public Guid IncidentId { get; set; }

    public List<Guid>? QuotationIds { get; set; }
}

public class QuotationComparisonCandidateDto
{
    public Guid QuotationId { get; set; }
    public Guid ProviderId { get; set; }
    public string ProviderBusinessName { get; set; } = string.Empty;
    public double ProviderRating { get; set; }
    public VerificationStatus ProviderVerificationStatus { get; set; }
    public decimal TotalAmount { get; set; }
    public bool IsWithinBudget { get; set; }
    public decimal DifferenceFromBudget { get; set; }
    public double BudgetUtilizationPercentage { get; set; }
    public bool IsLowestCost { get; set; }
    public decimal DifferenceFromLowest { get; set; }
    public double ComparisonScore { get; set; }
    public List<string> ComparisonReasons { get; set; } = new();
}

public class QuotationComparisonResultDto
{
    public Guid IncidentId { get; set; }
    public string IncidentTitle { get; set; } = string.Empty;
    public decimal? EstimatedBudget { get; set; }
    public int QuotationsEvaluatedCount { get; set; }
    public decimal LowestQuotationAmount { get; set; }
    public Guid? RecommendedQuotationId { get; set; }
    public List<QuotationComparisonCandidateDto> Candidates { get; set; } = new();
}
