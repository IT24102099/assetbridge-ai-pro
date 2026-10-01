using AssetBridge.Application.Common.Interfaces;
using AssetBridge.Domain.Exceptions;
using Google.Apis.Auth;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace AssetBridge.Infrastructure.Security;

public class GoogleAuthValidator : IGoogleAuthValidator
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<GoogleAuthValidator> _logger;

    public GoogleAuthValidator(IConfiguration configuration, ILogger<GoogleAuthValidator> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<GoogleUserPayload> ValidateIdTokenAsync(string idToken, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(idToken))
        {
            throw new ValidationException("IdToken", "Google ID token must not be empty.");
        }

        var clientId = _configuration["Google:ClientId"]
            ?? _configuration["Authentication:Google:ClientId"]
            ?? _configuration["GOOGLE_CLIENT_ID"];

        var settings = new GoogleJsonWebSignature.ValidationSettings();
        if (!string.IsNullOrWhiteSpace(clientId))
        {
            settings.Audience = new[] { clientId.Trim() };
        }

        try
        {
            var payload = await GoogleJsonWebSignature.ValidateAsync(idToken, settings);
            if (payload == null || string.IsNullOrWhiteSpace(payload.Email))
            {
                throw new ValidationException("IdToken", "Invalid Google ID token payload or missing email.");
            }

            return new GoogleUserPayload
            {
                Email = payload.Email,
                Name = payload.Name ?? $"{payload.GivenName} {payload.FamilyName}".Trim(),
                GivenName = payload.GivenName ?? string.Empty,
                FamilyName = payload.FamilyName ?? string.Empty,
                Subject = payload.Subject ?? string.Empty,
                EmailVerified = payload.EmailVerified
            };
        }
        catch (InvalidJwtException ex)
        {
            _logger.LogWarning(ex, "Google token validation failed: {Message}", ex.Message);
            throw new ValidationException("IdToken", "Invalid or expired Google authentication token.");
        }
        catch (Exception ex) when (ex is not ValidationException)
        {
            _logger.LogError(ex, "Unexpected error during Google token validation: {Message}", ex.Message);
            throw new ValidationException("IdToken", "Failed to validate Google authentication token.");
        }
    }
}
