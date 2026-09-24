namespace AssetBridge.Domain.Enums;

// Indicates the vetting and trust status of local representatives and service providers.
// Unverified, rejected, or suspended providers are strictly excluded from automated matching recommendations.
public enum VerificationStatus
{
    Pending = 1,
    Verified = 2,
    Rejected = 3,
    Suspended = 4
}
