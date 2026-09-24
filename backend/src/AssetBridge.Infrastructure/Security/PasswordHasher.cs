using AssetBridge.Application.Common.Interfaces;

namespace AssetBridge.Infrastructure.Security;

// BCrypt implementation of IPasswordHasher.
// BCrypt incorporates a random salt and adaptive work factor (12 rounds) to defend
// against rainbow table and brute-force attacks on user credentials.
public class PasswordHasher : IPasswordHasher
{
    private const int WorkFactor = 12;

    public string HashPassword(string password)
    {
        return BCrypt.Net.BCrypt.HashPassword(password, WorkFactor);
    }

    public bool VerifyPassword(string password, string passwordHash)
    {
        try
        {
            return BCrypt.Net.BCrypt.Verify(password, passwordHash);
        }
        catch
        {
            return false;
        }
    }
}
