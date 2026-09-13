using System.ComponentModel.DataAnnotations;
using AssetBridge.Domain.Enums;

namespace AssetBridge.Application.DTOs.Maintenance;

public class CreateQuotationItemRequestDto
{
    [Required(ErrorMessage = "Description is required.")]
    [StringLength(200, MinimumLength = 2, ErrorMessage = "Description must be between 2 and 200 characters.")]
    public string Description { get; set; } = string.Empty;

    [Range(0.01, 100000, ErrorMessage = "Quantity must be positive.")]
    public decimal Quantity { get; set; } = 1;

    [Range(0, 100000000, ErrorMessage = "Unit price must be non-negative.")]
    public decimal UnitPrice { get; set; }
}

public class UpdateQuotationItemRequestDto
{
    [Required(ErrorMessage = "Description is required.")]
    [StringLength(200, MinimumLength = 2, ErrorMessage = "Description must be between 2 and 200 characters.")]
    public string Description { get; set; } = string.Empty;

    [Range(0.01, 100000, ErrorMessage = "Quantity must be positive.")]
    public decimal Quantity { get; set; } = 1;

    [Range(0, 100000000, ErrorMessage = "Unit price must be non-negative.")]
    public decimal UnitPrice { get; set; }
}

public class QuotationItemResponseDto
{
    public Guid Id { get; set; }
    public Guid QuotationId { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal TotalPrice { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}

public class CreateQuotationRequestDto
{
    [Required(ErrorMessage = "Incident ID is required.")]
    public Guid IncidentId { get; set; }

    [Required(ErrorMessage = "Provider ID is required.")]
    public Guid ProviderId { get; set; }

    [Required(ErrorMessage = "Validity date is required.")]
    public DateTime ValidUntilUtc { get; set; }

    [StringLength(1000, ErrorMessage = "Notes cannot exceed 1000 characters.")]
    public string? Notes { get; set; }

    [Range(0, 100000000, ErrorMessage = "Tax and other charges must be non-negative.")]
    public decimal TaxAndOtherCharges { get; set; }

    [Required(ErrorMessage = "Quotation must contain at least one line item.")]
    [MinLength(1, ErrorMessage = "Quotation must contain at least one line item.")]
    public List<CreateQuotationItemRequestDto> Items { get; set; } = new();
}

public class UpdateQuotationRequestDto
{
    [Required(ErrorMessage = "Validity date is required.")]
    public DateTime ValidUntilUtc { get; set; }

    [StringLength(1000, ErrorMessage = "Notes cannot exceed 1000 characters.")]
    public string? Notes { get; set; }

    [Range(0, 100000000, ErrorMessage = "Tax and other charges must be non-negative.")]
    public decimal TaxAndOtherCharges { get; set; }
}

public class UpdateQuotationStatusRequestDto
{
    [Required(ErrorMessage = "Status is required.")]
    public QuotationStatus Status { get; set; }
}

public class QuotationQueryParametersDto
{
    private const int MaxPageSize = 50;
    private int _pageSize = 10;

    public Guid? IncidentId { get; set; }
    public Guid? ProviderId { get; set; }
    public QuotationStatus? Status { get; set; }
    public bool? ExcludeExpired { get; set; }

    public int PageNumber { get; set; } = 1;

    public int PageSize
    {
        get => _pageSize;
        set => _pageSize = value > MaxPageSize ? MaxPageSize : (value < 1 ? 1 : value);
    }

    public string? SortBy { get; set; } = "CreatedAtUtc";
    public bool SortDescending { get; set; } = true;
}

public class QuotationResponseDto
{
    public Guid Id { get; set; }
    public Guid IncidentId { get; set; }
    public string IncidentTitle { get; set; } = string.Empty;
    public Guid ProviderId { get; set; }
    public string ProviderBusinessName { get; set; } = string.Empty;
    public double ProviderRating { get; set; }
    public VerificationStatus ProviderVerificationStatus { get; set; }
    public DateTime ValidUntilUtc { get; set; }
    public bool IsExpired => ValidUntilUtc < DateTime.UtcNow;
    public string? Notes { get; set; }
    public decimal Subtotal { get; set; }
    public decimal TaxAndOtherCharges { get; set; }
    public decimal TotalAmount { get; set; }
    public QuotationStatus Status { get; set; }
    public string StatusName => Status.ToString();
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }

    public ICollection<QuotationItemResponseDto> Items { get; set; } = new List<QuotationItemResponseDto>();
}
