using System.ComponentModel.DataAnnotations;

namespace AssetBridge.Application.DTOs.Representatives;

// Carries registration information for an on-the-ground local representative.
public class CreateRepresentativeRequestDto
{
    [Required(ErrorMessage = "Full name is required.")]
    [StringLength(150, MinimumLength = 2, ErrorMessage = "Full name must be between 2 and 150 characters.")]
    public string FullName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Phone number is required.")]
    [Phone(ErrorMessage = "Please provide a valid phone number.")]
    public string PhoneNumber { get; set; } = string.Empty;

    [Required(ErrorMessage = "Email is required.")]
    [EmailAddress(ErrorMessage = "A valid email address is required.")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "District is required.")]
    [StringLength(100, ErrorMessage = "District cannot exceed 100 characters.")]
    public string District { get; set; } = string.Empty;

    [Required(ErrorMessage = "City is required.")]
    [StringLength(100, ErrorMessage = "City cannot exceed 100 characters.")]
    public string City { get; set; } = string.Empty;

    public string? Address { get; set; }

    [StringLength(50, ErrorMessage = "National ID cannot exceed 50 characters.")]
    public string? NationalIdNumber { get; set; }

    [StringLength(1000, ErrorMessage = "Bio cannot exceed 1000 characters.")]
    public string? Bio { get; set; }
}
