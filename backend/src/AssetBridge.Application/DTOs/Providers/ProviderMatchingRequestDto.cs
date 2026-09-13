using System.ComponentModel.DataAnnotations;
using AssetBridge.Domain.Enums;

namespace AssetBridge.Application.DTOs.Providers;

// Encapsulates criteria for matching verified contractors to an incident or maintenance requirement.
public class ProviderMatchingRequestDto
{
    // If IncidentId is provided, the matching engine automatically derives Category, Target coordinates, and District from the Incident & Asset.
    public Guid? IncidentId { get; set; }

    public IncidentCategory? Category { get; set; }

    public string? District { get; set; }

    public string? City { get; set; }

    [Range(-90.0, 90.0, ErrorMessage = "Latitude must be between -90 and 90.")]
    public double? TargetLatitude { get; set; }

    [Range(-180.0, 180.0, ErrorMessage = "Longitude must be between -180 and 180.")]
    public double? TargetLongitude { get; set; }

    public DateTime? RequiredDateUtc { get; set; }

    [Range(1.0, 200.0, ErrorMessage = "Max distance must be between 1km and 200km.")]
    public double MaxDistanceKm { get; set; } = 50.0;

    [Range(1, 20, ErrorMessage = "Max results must be between 1 and 20.")]
    public int MaxResults { get; set; } = 5;
}
