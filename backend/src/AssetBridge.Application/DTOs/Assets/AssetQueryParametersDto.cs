using AssetBridge.Domain.Enums;

namespace AssetBridge.Application.DTOs.Assets;

// Encapsulates server-side query filters, sorting, and pagination parameters for assets.
public class AssetQueryParametersDto
{
    private const int MaxPageSize = 50;
    private int _pageSize = 10;

    public string? Search { get; set; }
    public PropertyType? PropertyType { get; set; }
    public AssetStatus? Status { get; set; }
    public string? District { get; set; }
    public string? City { get; set; }

    public int PageNumber { get; set; } = 1;

    public int PageSize
    {
        get => _pageSize;
        set => _pageSize = value > MaxPageSize ? MaxPageSize : (value < 1 ? 1 : value);
    }

    public string? SortBy { get; set; } = "CreatedAtUtc";
    public bool SortDescending { get; set; } = true;
}
