namespace AssetBridge.Application.Common.Interfaces;

// Provides a contract for cryptographic password hashing and verification.
// Abstracts the underlying algorithm (BCrypt/PBKDF2) so the hashing mechanism
// can be upgraded or tested without altering authentication business rules.
public interface IPasswordHasher
{
    string HashPassword(string password);
    bool VerifyPassword(string password, string passwordHash);
}
