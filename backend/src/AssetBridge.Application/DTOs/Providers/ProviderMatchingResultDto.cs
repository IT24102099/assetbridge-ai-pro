using AssetBridge.Domain.Enums;

namespace AssetBridge.Application.DTOs.Providers;

// Represents a single candidate provider evaluated by the deterministic matching engine.
public class ProviderMatchCandidateDto
{
    public Guid ProviderId { get; set; }
    public string BusinessName { get; set; } = string.Empty;
    public string ContactPerson { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PrimaryDistrict { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public VerificationStatus VerificationStatus { get; set; }
    public double Rating { get; set; }
    public int CompletedJobsCount { get; set; }

    // Quantitative matching results
    public double MatchScore { get; set; } // 0 - 100
    public double? DistanceKm { get; set; }
    public bool HasRequiredSkill { get; set; }
    public List<string> MatchingSkills { get; set; } = new();
    public bool? IsAvailableOnRequiredDate { get; set; }

    // Deterministic factual explanations for the Provider Intelligence Agent and Owner UI
    public List<string> ExplanationReasons { get; set; } = new();
}

// Encapsulates the overall result of the provider matching operation.
public class ProviderMatchingResultDto
{
    public IncidentCategory? TargetCategory { get; set; }
    public string? TargetDistrict { get; set; }
    public DateTime? TargetDateUtc { get; set; }
    public int TotalCandidatesEvaluated { get; set; }
    public int MatchedCandidatesCount { get; set; }
    public List<ProviderMatchCandidateDto> Candidates { get; set; } = new();
}
