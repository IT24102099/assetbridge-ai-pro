using AssetBridge.Domain.Entities.Common;
using AssetBridge.Domain.Enums;

namespace AssetBridge.Domain.Entities.Users;

// Represents an authenticated user in the AssetBridge AI system.
// This single unified User entity supports all system roles (Owner, Rep, Provider, Manager, Admin)
// while allowing role-specific profile extensions to attach cleanly in subsequent phases.
public class User : BaseEntity
{
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public UserRole Role { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime? LastLoginAtUtc { get; set; }
}
