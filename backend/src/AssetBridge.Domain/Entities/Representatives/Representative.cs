using AssetBridge.Domain.Entities.Common;
using AssetBridge.Domain.Entities.Users;
using AssetBridge.Domain.Enums;

namespace AssetBridge.Domain.Entities.Representatives;

// Represents a vetted local on-the-ground coordinator in Sri Lanka acting on behalf of overseas owners.
// Connects to User identity without duplicating authentication credentials.
public class Representative : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public string FullName { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string District { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? NationalIdNumber { get; set; }
    public VerificationStatus VerificationStatus { get; set; } = VerificationStatus.Pending;
    public string? VerificationNotes { get; set; }
    public string? Bio { get; set; }
    public bool IsActive { get; set; } = true;
}
