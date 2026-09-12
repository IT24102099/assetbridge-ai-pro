using AssetBridge.Domain.Enums;

namespace AssetBridge.Application.DTOs.Auth;

// Represents the sanitized profile payload returned to clients without exposing sensitive security data (e.g. PasswordHash).
public class UserProfileDto
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public UserRole Role { get; set; }
    public string RoleName => Role.ToString();
    public bool IsActive { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? LastLoginAtUtc { get; set; }
}
