namespace AssetBridge.Infrastructure.Security;

// Strongly-typed options class binding to the "JwtSettings" configuration section.
// Centralizes JWT signing key, issuer, audience, and expiry configuration.
public class JwtSettings
{
    public const string SectionName = "JwtSettings";

    public string Secret { get; set; } = string.Empty;
    public string Issuer { get; set; } = "AssetBridgeAI";
    public string Audience { get; set; } = "AssetBridgeAI";
    public int ExpiryMinutes { get; set; } = 1440;
}
