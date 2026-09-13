using System.ComponentModel.DataAnnotations;
using AssetBridge.Domain.Enums;

namespace AssetBridge.Application.DTOs.Assets;

// Carries property details submitted by an overseas owner when registering an asset.
public class CreateAssetRequestDto
{
    [Required(ErrorMessage = "Property name is required.")]
    [StringLength(150, MinimumLength = 3, ErrorMessage = "Name must be between 3 and 150 characters.")]
    public string Name { get; set; } = string.Empty;

    [Required(ErrorMessage = "Property type is required.")]
    public PropertyType PropertyType { get; set; }

    [Required(ErrorMessage = "Address line 1 is required.")]
    [StringLength(200, ErrorMessage = "Address cannot exceed 200 characters.")]
    public string AddressLine1 { get; set; } = string.Empty;

    public string? AddressLine2 { get; set; }

    [Required(ErrorMessage = "City is required.")]
    [StringLength(100, ErrorMessage = "City cannot exceed 100 characters.")]
    public string City { get; set; } = string.Empty;

    [Required(ErrorMessage = "District is required.")]
    [StringLength(100, ErrorMessage = "District cannot exceed 100 characters.")]
    public string District { get; set; } = string.Empty;

    public string? PostalCode { get; set; }

    [Range(-90.0, 90.0, ErrorMessage = "Latitude must be between -90 and 90.")]
    public double? Latitude { get; set; }

    [Range(-180.0, 180.0, ErrorMessage = "Longitude must be between -180 and 180.")]
    public double? Longitude { get; set; }

    [StringLength(1000, ErrorMessage = "Description cannot exceed 1000 characters.")]
    public string? Description { get; set; }
}
