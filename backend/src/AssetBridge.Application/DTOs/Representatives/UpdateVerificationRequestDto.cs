using System.ComponentModel.DataAnnotations;
using AssetBridge.Domain.Enums;

namespace AssetBridge.Application.DTOs.Representatives;

// Carries manager or admin verification decisions for representatives and service providers.
public class UpdateVerificationRequestDto
{
    [Required(ErrorMessage = "Verification status is required.")]
    public VerificationStatus VerificationStatus { get; set; }

    [StringLength(500, ErrorMessage = "Verification notes cannot exceed 500 characters.")]
    public string? VerificationNotes { get; set; }
}
