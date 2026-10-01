using AssetBridge.Application.Common.Interfaces;
using AssetBridge.Application.DTOs.Auth;
using AssetBridge.Application.Services.Interfaces;
using AssetBridge.Domain.Entities.Users;
using AssetBridge.Domain.Enums;
using AssetBridge.Domain.Exceptions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AssetBridge.Application.Services.Implementations;

// Implements authentication operations while enforcing business constraints
// (e.g. duplicate email checks, password verification, active account status).
public class AuthService : IAuthService
{
    private readonly IApplicationDbContext _context;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;
    private readonly IGoogleAuthValidator _googleAuthValidator;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        IApplicationDbContext context,
        IPasswordHasher passwordHasher,
        IJwtTokenGenerator jwtTokenGenerator,
        IGoogleAuthValidator googleAuthValidator,
        ILogger<AuthService> logger)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _jwtTokenGenerator = jwtTokenGenerator;
        _googleAuthValidator = googleAuthValidator;
        _logger = logger;
    }

    public async Task<LoginResponseDto> LoginAsync(LoginRequestDto request, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail, cancellationToken);

        if (user == null || !_passwordHasher.VerifyPassword(request.Password, user.PasswordHash))
        {
            _logger.LogWarning("Authentication failed for email: {Email}", request.Email);
            throw new ValidationException("Email", "Invalid email or password.");
        }

        if (!user.IsActive)
        {
            _logger.LogWarning("Authentication rejected for deactivated user: {UserId}", user.Id);
            throw new DomainException("This user account has been deactivated. Please contact support.");
        }

        user.LastLoginAtUtc = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        var token = _jwtTokenGenerator.GenerateToken(user);

        return new LoginResponseDto
        {
            Token = token,
            TokenType = "Bearer",
            ExpiresInMinutes = 1440, // 24 hours standard token lifetime
            User = MapToProfileDto(user)
        };
    }

    public async Task<LoginResponseDto> GoogleLoginAsync(GoogleAuthRequestDto request, CancellationToken cancellationToken = default)
    {
        var googleUser = await _googleAuthValidator.ValidateIdTokenAsync(request.IdToken, cancellationToken);

        var normalizedEmail = googleUser.Email.Trim().ToLowerInvariant();

        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail, cancellationToken);

        if (user == null)
        {
            // Safely provision demo/standard account with default Owner role and non-guessable random password
            var randomPassword = Guid.NewGuid().ToString("N") + "Aa1!";
            user = new User
            {
                Id = Guid.NewGuid(),
                Email = normalizedEmail,
                FullName = !string.IsNullOrWhiteSpace(googleUser.Name) ? googleUser.Name.Trim() : "Google User",
                PasswordHash = _passwordHasher.HashPassword(randomPassword),
                Role = UserRole.Owner,
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow,
                LastLoginAtUtc = DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync(cancellationToken);
            _logger.LogInformation("New user provisioned via Google Sign-In: {UserId} ({Email})", user.Id, user.Email);
        }
        else
        {
            if (!user.IsActive)
            {
                _logger.LogWarning("Google authentication rejected for deactivated user: {UserId}", user.Id);
                throw new DomainException("This user account has been deactivated. Please contact support.");
            }

            user.LastLoginAtUtc = DateTime.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);
            _logger.LogInformation("User authenticated via Google Sign-In: {UserId} ({Email})", user.Id, user.Email);
        }

        var token = _jwtTokenGenerator.GenerateToken(user);

        return new LoginResponseDto
        {
            Token = token,
            TokenType = "Bearer",
            ExpiresInMinutes = 1440,
            User = MapToProfileDto(user)
        };
    }

    public async Task<UserProfileDto> RegisterAsync(RegisterRequestDto request, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        var existingUser = await _context.Users
            .AnyAsync(u => u.Email.ToLower() == normalizedEmail, cancellationToken);

        if (existingUser)
        {
            throw new ValidationException("Email", "A user with this email address already exists.");
        }

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = normalizedEmail,
            PasswordHash = _passwordHasher.HashPassword(request.Password),
            FullName = request.FullName.Trim(),
            PhoneNumber = request.PhoneNumber?.Trim(),
            Role = request.Role,
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("New user registered successfully: {UserId} with role {Role}", user.Id, user.Role);

        return MapToProfileDto(user);
    }

    public async Task<UserProfileDto> GetCurrentUserProfileAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

        if (user == null)
        {
            throw new EntityNotFoundException(nameof(User), userId);
        }

        return MapToProfileDto(user);
    }

    private static UserProfileDto MapToProfileDto(User user)
    {
        return new UserProfileDto
        {
            Id = user.Id,
            Email = user.Email,
            FullName = user.FullName,
            PhoneNumber = user.PhoneNumber,
            Role = user.Role,
            IsActive = user.IsActive,
            CreatedAtUtc = user.CreatedAtUtc,
            LastLoginAtUtc = user.LastLoginAtUtc
        };
    }
}
