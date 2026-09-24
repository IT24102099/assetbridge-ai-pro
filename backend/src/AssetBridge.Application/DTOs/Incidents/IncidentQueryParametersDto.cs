using AssetBridge.Domain.Enums;

namespace AssetBridge.Application.DTOs.Incidents;

// Encapsulates server-side query filters, sorting, and pagination parameters for incidents.
public class IncidentQueryParametersDto
{
    private const int MaxPageSize = 50;
    private int _pageSize = 10;

    public string? Search { get; set; }
    public Guid? AssetId { get; set; }
    public IncidentCategory? Category { get; set; }
    public IncidentPriority? Priority { get; set; }
    public IncidentStatus? Status { get; set; }

    public int PageNumber { get; set; } = 1;

    public int PageSize
    {
        get => _pageSize;
        set => _pageSize = value > MaxPageSize ? MaxPageSize : (value < 1 ? 1 : value);
    }

    public string? SortBy { get; set; } = "CreatedAtUtc";
    public bool SortDescending { get; set; } = true;
}
