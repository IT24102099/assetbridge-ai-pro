using AssetBridge.Application.Common.Interfaces;
using AssetBridge.Application.DTOs.Providers;
using AssetBridge.Application.Services.Interfaces;
using AssetBridge.Domain.Entities.Incidents;
using AssetBridge.Domain.Entities.Providers;
using AssetBridge.Domain.Enums;
using AssetBridge.Domain.Exceptions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AssetBridge.Application.Services.Implementations;

// Implements deterministic, explainable provider matching.
// Evaluates verified contractors against incident categories, geographic distance, availability, and past performance.
public class ProviderMatchingService : IProviderMatchingService
{
    private readonly IApplicationDbContext _context;
    private readonly ILocationService _locationService;
    private readonly ILogger<ProviderMatchingService> _logger;

    public ProviderMatchingService(
        IApplicationDbContext context,
        ILocationService locationService,
        ILogger<ProviderMatchingService> logger)
    {
        _context = context;
        _locationService = locationService;
        _logger = logger;
    }

    public async Task<ProviderMatchingResultDto> MatchProvidersAsync(ProviderMatchingRequestDto request, CancellationToken cancellationToken = default)
    {
        var category = request.Category;
        var district = request.District;
        var city = request.City;
        var targetLat = request.TargetLatitude;
        var targetLon = request.TargetLongitude;
        var requiredDate = request.RequiredDateUtc;

        // If an IncidentId is provided, resolve criteria directly from the Incident & Asset records
        if (request.IncidentId.HasValue)
        {
            var incident = await _context.Incidents
                .AsNoTracking()
                .Include(i => i.Asset)
                .FirstOrDefaultAsync(i => i.Id == request.IncidentId.Value, cancellationToken);

            if (incident == null)
            {
                throw new EntityNotFoundException(nameof(Incident), request.IncidentId.Value);
            }

            category = incident.Category;
            district = incident.Asset.District;
            city = incident.Asset.City;
            targetLat = incident.Asset.Latitude;
            targetLon = incident.Asset.Longitude;
            requiredDate ??= incident.RequiredByUtc;
        }

        // Strict Business Rule: Only evaluate active providers with Verified status
        var candidatesQuery = _context.ServiceProviders
            .AsNoTracking()
            .Include(p => p.Skills)
            .Include(p => p.AvailabilitySlots)
            .Include(p => p.HistoryEntries)
            .Where(p => p.IsActive && p.VerificationStatus == VerificationStatus.Verified);

        // Filter to providers possessing the required skill category if specified
        if (category.HasValue)
        {
            candidatesQuery = candidatesQuery.Where(p => p.Skills.Any(s => s.Category == category.Value));
        }

        var candidateProviders = await candidatesQuery.ToListAsync(cancellationToken);
        var evaluatedCandidates = new List<ProviderMatchCandidateDto>();

        foreach (var provider in candidateProviders)
        {
            var candidate = EvaluateProvider(provider, category, district, city, targetLat, targetLon, requiredDate, request.MaxDistanceKm);
            evaluatedCandidates.Add(candidate);
        }

        // Order candidates by deterministic MatchScore descending, then by Rating, then by CompletedJobs
        var rankedCandidates = evaluatedCandidates
            .OrderByDescending(c => c.MatchScore)
            .ThenByDescending(c => c.Rating)
            .ThenByDescending(c => c.CompletedJobsCount)
            .Take(request.MaxResults)
            .ToList();

        _logger.LogInformation("Provider matching executed for Category: {Category}, District: {District}. Evaluated: {Evaluated}, Returned: {Returned}",
            category, district, candidateProviders.Count, rankedCandidates.Count);

        return new ProviderMatchingResultDto
        {
            TargetCategory = category,
            TargetDistrict = district,
            TargetDateUtc = requiredDate,
            TotalCandidatesEvaluated = candidateProviders.Count,
            MatchedCandidatesCount = rankedCandidates.Count,
            Candidates = rankedCandidates
        };
    }

    private ProviderMatchCandidateDto EvaluateProvider(
        ServiceProvider provider,
        IncidentCategory? category,
        string? targetDistrict,
        string? targetCity,
        double? targetLat,
        double? targetLon,
        DateTime? requiredDate,
        double maxDistanceKm)
    {
        var explanations = new List<string>();
        double totalScore = 0;

        // Baseline verification reason
        explanations.Add("Verified professional contractor verified by AssetBridge");

        // 1. Skill Match Dimension (Max: 35 points)
        bool hasRequiredSkill = false;
        var matchingSkillNames = new List<string>();

        if (category.HasValue)
        {
            var matchingSkill = provider.Skills.FirstOrDefault(s => s.Category == category.Value);
            if (matchingSkill != null)
            {
                hasRequiredSkill = true;
                matchingSkillNames.Add(matchingSkill.SkillName);

                double skillScore = 25.0; // Base match

                if (matchingSkill.IsPrimary)
                {
                    skillScore += 5.0;
                }

                if (matchingSkill.YearsOfExperience >= 5)
                {
                    skillScore += 5.0;
                }
                else if (matchingSkill.YearsOfExperience >= 2)
                {
                    skillScore += 2.0;
                }

                totalScore += Math.Min(35.0, skillScore);

                var primaryTag = matchingSkill.IsPrimary ? " (Primary trade)" : string.Empty;
                explanations.Add($"Holds verified {matchingSkill.SkillName} skill with {matchingSkill.YearsOfExperience} years experience{primaryTag}");
            }
        }
        else
        {
            // No specific skill required
            totalScore += 25.0;
            matchingSkillNames.AddRange(provider.Skills.Select(s => s.SkillName));
        }

        // 2. Availability Dimension (Max: 25 points)
        bool? isAvailableOnDate = null;
        if (requiredDate.HasValue)
        {
            var dateOnly = requiredDate.Value.Date;
            var slot = provider.AvailabilitySlots
                .FirstOrDefault(a => a.AvailableDateUtc.Date == dateOnly);

            if (slot != null)
            {
                if (slot.Status == AvailabilityStatus.Available)
                {
                    isAvailableOnDate = true;
                    totalScore += 25.0;
                    explanations.Add($"Confirmed available on requested date ({dateOnly:yyyy-MM-dd})");
                }
                else
                {
                    isAvailableOnDate = false;
                    totalScore += 0.0;
                    explanations.Add($"Contractor is marked busy/unavailable on requested date ({dateOnly:yyyy-MM-dd})");
                }
            }
            else
            {
                // Availability not explicitly registered for that date - neutral score
                isAvailableOnDate = null;
                totalScore += 12.0;
                explanations.Add($"Availability not explicitly scheduled for {dateOnly:yyyy-MM-dd}");
            }
        }
        else
        {
            // Standard general availability
            totalScore += 20.0;
        }

        // 3. Location & Geographic Proximity Dimension (Max: 25 points)
        double? calculatedDistanceKm = null;
        if (targetLat.HasValue && targetLon.HasValue && provider.BaseLatitude.HasValue && provider.BaseLongitude.HasValue)
        {
            calculatedDistanceKm = _locationService.CalculateDistanceKm(
                targetLat.Value, targetLon.Value,
                provider.BaseLatitude.Value, provider.BaseLongitude.Value);

            if (calculatedDistanceKm.Value <= provider.ServiceRadiusKm)
            {
                // Proximity scaling
                var proximityRatio = 1.0 - (calculatedDistanceKm.Value / Math.Max(provider.ServiceRadiusKm, 10.0));
                var locationScore = 15.0 + (10.0 * Math.Max(0.0, proximityRatio));
                totalScore += Math.Min(25.0, locationScore);

                explanations.Add($"Located {calculatedDistanceKm.Value:F1} km from property (within {provider.ServiceRadiusKm:F0} km service radius)");
            }
            else if (calculatedDistanceKm.Value <= maxDistanceKm)
            {
                // Exceeds provider preferred radius but within search boundary
                totalScore += 8.0;
                explanations.Add($"Located {calculatedDistanceKm.Value:F1} km away (exceeds preferred radius of {provider.ServiceRadiusKm:F0} km)");
            }
            else
            {
                totalScore += 0.0;
                explanations.Add($"Located {calculatedDistanceKm.Value:F1} km away (exceeds maximum search radius of {maxDistanceKm:F0} km)");
            }
        }
        else if (!string.IsNullOrWhiteSpace(targetDistrict))
        {
            // Fallback to District matching when coordinates are unavailable
            if (provider.PrimaryDistrict.Equals(targetDistrict.Trim(), StringComparison.OrdinalIgnoreCase))
            {
                double districtScore = 18.0;

                if (!string.IsNullOrWhiteSpace(targetCity) && provider.City.Equals(targetCity.Trim(), StringComparison.OrdinalIgnoreCase))
                {
                    districtScore += 5.0;
                    explanations.Add($"Operates in the same city ({targetCity}) and district ({targetDistrict}) - exact GPS distance unavailable");
                }
                else
                {
                    explanations.Add($"Operates in the same district ({targetDistrict}) - exact GPS distance unavailable");
                }

                totalScore += districtScore;
            }
            else
            {
                totalScore += 2.0;
                explanations.Add($"Operating district ({provider.PrimaryDistrict}) differs from target district ({targetDistrict})");
            }
        }
        else
        {
            totalScore += 10.0;
            explanations.Add("Location proximity could not be determined from given parameters");
        }

        // 4. Performance & Track Record Dimension (Max: 15 points)
        var ratingScore = (provider.Rating / 5.0) * 10.0;
        var jobsBonus = Math.Min(5.0, provider.CompletedJobsCount * 0.5);
        var performanceScore = Math.Min(15.0, ratingScore + jobsBonus);
        totalScore += performanceScore;

        explanations.Add($"Track record: {provider.Rating:F1}/5.0 rating with {provider.CompletedJobsCount} completed jobs");

        var normalizedScore = Math.Round(Math.Clamp(totalScore, 0.0, 100.0), 1);

        return new ProviderMatchCandidateDto
        {
            ProviderId = provider.Id,
            BusinessName = provider.BusinessName,
            ContactPerson = provider.ContactPerson,
            PhoneNumber = provider.PhoneNumber,
            Email = provider.Email,
            PrimaryDistrict = provider.PrimaryDistrict,
            City = provider.City,
            VerificationStatus = provider.VerificationStatus,
            Rating = provider.Rating,
            CompletedJobsCount = provider.CompletedJobsCount,
            MatchScore = normalizedScore,
            DistanceKm = calculatedDistanceKm,
            HasRequiredSkill = hasRequiredSkill,
            MatchingSkills = matchingSkillNames,
            IsAvailableOnRequiredDate = isAvailableOnDate,
            ExplanationReasons = explanations
        };
    }
}
