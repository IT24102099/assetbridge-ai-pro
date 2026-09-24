using AssetBridge.Application.Common.Interfaces;
using AssetBridge.Application.DTOs.Maintenance;
using AssetBridge.Application.Services.Interfaces;
using AssetBridge.Domain.Entities.Incidents;
using AssetBridge.Domain.Entities.Maintenance;
using AssetBridge.Domain.Enums;
using AssetBridge.Domain.Exceptions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AssetBridge.Application.Services.Implementations;

public class QuotationComparisonService : IQuotationComparisonService
{
    private readonly IApplicationDbContext _context;
    private readonly ILogger<QuotationComparisonService> _logger;

    public QuotationComparisonService(
        IApplicationDbContext context,
        ILogger<QuotationComparisonService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<QuotationComparisonResultDto> CompareQuotationsAsync(QuotationComparisonRequestDto request, CancellationToken cancellationToken = default)
    {
        var incident = await _context.Incidents
            .AsNoTracking()
            .FirstOrDefaultAsync(i => i.Id == request.IncidentId, cancellationToken);

        if (incident == null)
        {
            throw new EntityNotFoundException(nameof(Incident), request.IncidentId);
        }

        var quotationsQuery = _context.Quotations
            .AsNoTracking()
            .Include(q => q.Provider)
            .Include(q => q.Items)
            .Where(q => q.IncidentId == request.IncidentId);

        if (request.QuotationIds != null && request.QuotationIds.Any())
        {
            quotationsQuery = quotationsQuery.Where(q => request.QuotationIds.Contains(q.Id));
        }

        var quotations = await quotationsQuery.ToListAsync(cancellationToken);

        if (!quotations.Any())
        {
            return new QuotationComparisonResultDto
            {
                IncidentId = incident.Id,
                IncidentTitle = incident.Title,
                EstimatedBudget = incident.EstimatedBudget,
                QuotationsEvaluatedCount = 0,
                LowestQuotationAmount = 0,
                RecommendedQuotationId = null,
                Candidates = new List<QuotationComparisonCandidateDto>()
            };
        }

        var lowestAmount = quotations.Min(q => q.TotalAmount);
        var budget = incident.EstimatedBudget ?? 0;
        var now = DateTime.UtcNow;

        var candidates = new List<QuotationComparisonCandidateDto>();

        foreach (var q in quotations)
        {
            var reasons = new List<string>();
            double score = 0;

            var isLowest = q.TotalAmount == lowestAmount;
            var diffFromLowest = q.TotalAmount - lowestAmount;

            var isWithinBudget = budget <= 0 || q.TotalAmount <= budget;
            var diffFromBudget = budget > 0 ? budget - q.TotalAmount : 0;
            var budgetUtil = budget > 0 ? Math.Round((double)(q.TotalAmount / budget) * 100.0, 1) : 100.0;

            // 1. Cost Dimension (Max: 40 points)
            if (q.TotalAmount > 0)
            {
                var priceRatio = (double)(lowestAmount / q.TotalAmount);
                var costScore = Math.Round(priceRatio * 40.0, 1);
                score += costScore;

                if (isLowest)
                {
                    reasons.Add("Lowest quotation amount among all evaluated candidates");
                }
                else
                {
                    reasons.Add($"LKR {diffFromLowest:N2} higher than the lowest quote ({q.TotalAmount:N2} vs {lowestAmount:N2} LKR)");
                }
            }

            // 2. Budget Compliance Dimension (Max: 25 points)
            if (budget > 0)
            {
                if (isWithinBudget)
                {
                    score += 25.0;
                    reasons.Add($"Within owner's budget of LKR {budget:N2} ({budgetUtil:F1}% of budget)");
                }
                else
                {
                    var overRatio = Math.Max(0.0, 1.0 - (double)(Math.Abs(diffFromBudget) / budget));
                    score += Math.Round(overRatio * 10.0, 1);
                    reasons.Add($"Exceeds owner's budget by LKR {Math.Abs(diffFromBudget):N2}");
                }
            }
            else
            {
                score += 20.0;
                reasons.Add("No owner budget ceiling specified");
            }

            // 3. Contractor Reputation & Verification (Max: 25 points)
            if (q.Provider?.VerificationStatus == VerificationStatus.Verified)
            {
                score += 10.0;
                reasons.Add("Submitted by an AssetBridge verified professional contractor");
            }
            else
            {
                reasons.Add("Contractor verification is currently pending review");
            }

            var rating = q.Provider?.Rating ?? 5.0;
            var ratingScore = Math.Round((rating / 5.0) * 15.0, 1);
            score += ratingScore;
            reasons.Add($"Contractor track record rating: {rating:F1}/5.0");

            // 4. Validity (Max: 10 points)
            if (q.ValidUntilUtc >= now)
            {
                score += 10.0;
                reasons.Add($"Valid quotation until {q.ValidUntilUtc:yyyy-MM-dd}");
            }
            else
            {
                reasons.Add($"Quotation expired on {q.ValidUntilUtc:yyyy-MM-dd}");
            }

            candidates.Add(new QuotationComparisonCandidateDto
            {
                QuotationId = q.Id,
                ProviderId = q.ProviderId,
                ProviderBusinessName = q.Provider?.BusinessName ?? string.Empty,
                ProviderRating = rating,
                ProviderVerificationStatus = q.Provider?.VerificationStatus ?? VerificationStatus.Pending,
                TotalAmount = q.TotalAmount,
                IsWithinBudget = isWithinBudget,
                DifferenceFromBudget = diffFromBudget,
                BudgetUtilizationPercentage = budgetUtil,
                IsLowestCost = isLowest,
                DifferenceFromLowest = diffFromLowest,
                ComparisonScore = Math.Round(Math.Clamp(score, 0.0, 100.0), 1),
                ComparisonReasons = reasons
            });
        }

        var rankedCandidates = candidates
            .OrderByDescending(c => c.ComparisonScore)
            .ThenBy(c => c.TotalAmount)
            .ToList();

        var recommendedId = rankedCandidates.FirstOrDefault()?.QuotationId;

        _logger.LogInformation("Quotation comparison completed for Incident {IncidentId}. Evaluated: {Count}, Recommended: {RecommendedId}",
            incident.Id, rankedCandidates.Count, recommendedId);

        return new QuotationComparisonResultDto
        {
            IncidentId = incident.Id,
            IncidentTitle = incident.Title,
            EstimatedBudget = incident.EstimatedBudget,
            QuotationsEvaluatedCount = rankedCandidates.Count,
            LowestQuotationAmount = lowestAmount,
            RecommendedQuotationId = recommendedId,
            Candidates = rankedCandidates
        };
    }
}
