using System.ComponentModel.DataAnnotations;
using AssetBridge.Domain.Enums;

namespace AssetBridge.Application.DTOs.Providers;

public class ProviderHistoryResponseDto
{
    public Guid Id { get; set; }
    public Guid ProviderId { get; set; }
    public ProviderHistoryType EventType { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public double? RatingScore { get; set; }
    public Guid? RelatedIncidentId { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}

public class AddProviderHistoryRequestDto
{
    [Required(ErrorMessage = "Event type is required.")]
    public ProviderHistoryType EventType { get; set; }

    [Required(ErrorMessage = "Title is required.")]
    [StringLength(200, MinimumLength = 2, ErrorMessage = "Title must be between 2 and 200 characters.")]
    public string Title { get; set; } = string.Empty;

    [Required(ErrorMessage = "Description is required.")]
    [StringLength(1000, ErrorMessage = "Description cannot exceed 1000 characters.")]
    public string Description { get; set; } = string.Empty;

    [Range(1.0, 5.0, ErrorMessage = "Rating must be between 1.0 and 5.0.")]
    public double? RatingScore { get; set; }

    public Guid? RelatedIncidentId { get; set; }
}
