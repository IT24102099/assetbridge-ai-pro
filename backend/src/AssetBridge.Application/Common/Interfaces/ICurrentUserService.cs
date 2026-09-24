using AssetBridge.Domain.Enums;

namespace AssetBridge.Application.Common.Interfaces;

// Provides access to the currently authenticated user's identity details
// extracted from the ambient HTTP request context or background execution context.
public interface ICurrentUserService
{
    Guid? UserId { get; }
    string? Email { get; }
    UserRole? Role { get; }
    bool IsAuthenticated { get; }
}
