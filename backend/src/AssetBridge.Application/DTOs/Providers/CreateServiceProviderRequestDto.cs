using System.ComponentModel.DataAnnotations;

namespace AssetBridge.Application.DTOs.Providers;

// Carries registration information for a professional contractor or technician.
public class CreateServiceProviderRequestDto
{
    [Required(ErrorMessage = "Business or trade name is required.")]
    [StringLength(150, MinimumLength = 2, ErrorMessage = "Business name must be between 2 and 150 characters.")]
    public string BusinessName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Contact person name is required.")]
    [StringLength(150, MinimumLength = 2, ErrorMessage = "Contact person must be between 2 and 150 characters.")]
    public string ContactPerson { get; set; } = string.Empty;

    [Required(ErrorMessage = "Phone number is required.")]
    [Phone(ErrorMessage = "Please provide a valid phone number.")]
    public string PhoneNumber { get; set; } = string.Empty;

    [Required(ErrorMessage = "Email is required.")]
    [EmailAddress(ErrorMessage = "A valid email address is required.")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Primary district is required.")]
    [StringLength(100, ErrorMessage = "District cannot exceed 100 characters.")]
    public string PrimaryDistrict { get; set; } = string.Empty;

    [Required(ErrorMessage = "City is required.")]
    [StringLength(100, ErrorMessage = "City cannot exceed 100 characters.")]
    public string City { get; set; } = string.Empty;

    public string? Address { get; set; }

    [Range(-90.0, 90.0, ErrorMessage = "Latitude must be between -90 and 90.")]
    public double? BaseLatitude { get; set; }

    [Range(-180.0, 180.0, ErrorMessage = "Longitude must be between -180 and 180.")]
    public double? BaseLongitude { get; set; }

    [Range(1.0, 200.0, ErrorMessage = "Service radius must be between 1km and 200km.")]
    public double ServiceRadiusKm { get; set; } = 30.0;
}
