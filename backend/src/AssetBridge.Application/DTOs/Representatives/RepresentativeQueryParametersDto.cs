using AssetBridge.Domain.Enums;

namespace AssetBridge.Application.DTOs.Representatives;

// Encapsulates server-side query filters, sorting, and pagination parameters for representatives.
public class RepresentativeQueryParametersDto
{
    private const int MaxPageSize = 50;
    private int _pageSize = 10;

    public string? Search { get; set; }
    public string? District { get; set; }
    public string? City { get; set; }
    public VerificationStatus? VerificationStatus { get; set; }
    public bool? IsActive { get; set; }

    public int PageNumber { get; set; } = 1;

    public int PageSize
    {
        get => _pageSize;
        set => _pageSize = value > MaxPageSize ? MaxPageSize : (value < 1 ? 1 : value);
    }

    public string? SortBy { get; set; } = "CreatedAtUtc";
    public bool SortDescending { get; set; } = true;
}
