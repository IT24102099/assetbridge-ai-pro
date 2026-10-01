namespace AssetBridge.Application.Common.Interfaces;

public class GoogleUserPayload
{
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string GivenName { get; set; } = string.Empty;
    public string FamilyName { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public bool EmailVerified { get; set; }
}

public interface IGoogleAuthValidator
{
    Task<GoogleUserPayload> ValidateIdTokenAsync(string idToken, CancellationToken cancellationToken = default);
}
