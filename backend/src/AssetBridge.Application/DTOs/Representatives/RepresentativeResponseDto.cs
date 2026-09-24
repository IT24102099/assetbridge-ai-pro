using AssetBridge.Domain.Enums;

namespace AssetBridge.Application.DTOs.Representatives;

// Represents the representative profile returned across API endpoints.
public class RepresentativeResponseDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string District { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? NationalIdNumber { get; set; }
    public VerificationStatus VerificationStatus { get; set; }
    public string VerificationStatusName => VerificationStatus.ToString();
    public string? VerificationNotes { get; set; }
    public string? Bio { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
}
