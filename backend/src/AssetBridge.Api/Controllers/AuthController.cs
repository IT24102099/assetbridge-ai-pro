using AssetBridge.Application.Common.Interfaces;
using AssetBridge.Application.DTOs.Auth;
using AssetBridge.Application.Services.Interfaces;
using AssetBridge.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AssetBridge.Api.Controllers;

// Handles authentication, registration, and user profile queries.
// Implements role-based authorization ensuring protected endpoints require valid JWT credentials.
public class AuthController : BaseApiController
{
    private readonly IAuthService _authService;
    private readonly ICurrentUserService _currentUserService;

    public AuthController(IAuthService authService, ICurrentUserService currentUserService)
    {
        _authService = authService;
        _currentUserService = currentUserService;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(LoginResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Login([FromBody] LoginRequestDto request, CancellationToken cancellationToken)
    {
        var response = await _authService.LoginAsync(request, cancellationToken);
        return HandleSuccess(response, "Login successful.");
    }

    [HttpPost("register")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(UserProfileDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Register([FromBody] RegisterRequestDto request, CancellationToken cancellationToken)
    {
        var response = await _authService.RegisterAsync(request, cancellationToken);
        return HandleCreated($"/api/auth/me", response, "User registered successfully.");
    }

    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType(typeof(UserProfileDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetCurrentUser(CancellationToken cancellationToken)
    {
        if (_currentUserService.UserId == null)
        {
            return Unauthorized();
        }

        var profile = await _authService.GetCurrentUserProfileAsync(_currentUserService.UserId.Value, cancellationToken);
        return HandleSuccess(profile, "User profile retrieved successfully.");
    }

    [HttpGet("roles")]
    [AllowAnonymous]
    public IActionResult GetAvailableRoles()
    {
        var roles = Enum.GetValues<UserRole>()
            .Select(r => new
            {
                Id = (int)r,
                Name = r.ToString()
            });

        return HandleSuccess(roles, "Available system roles retrieved.");
    }
}
