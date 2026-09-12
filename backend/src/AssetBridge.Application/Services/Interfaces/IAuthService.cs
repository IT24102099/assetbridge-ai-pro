using AssetBridge.Application.DTOs.Auth;

namespace AssetBridge.Application.Services.Interfaces;

// Encapsulates authentication and user lifecycle business rules.
// Keeping this in the application layer ensures both web and mobile controllers
// remain thin orchestrators without duplicating authentication logic.
public interface IAuthService
{
    Task<LoginResponseDto> LoginAsync(LoginRequestDto request, CancellationToken cancellationToken = default);
    Task<UserProfileDto> RegisterAsync(RegisterRequestDto request, CancellationToken cancellationToken = default);
    Task<UserProfileDto> GetCurrentUserProfileAsync(Guid userId, CancellationToken cancellationToken = default);
}
