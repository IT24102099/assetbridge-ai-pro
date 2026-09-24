using AssetBridge.Domain.Entities.Users;

namespace AssetBridge.Application.Common.Interfaces;

// Generates signed JSON Web Tokens (JWT) containing standard claims (Sub, Email, Role, Name).
// Tokens provide stateless authentication for both web (React) and mobile (Flutter) clients.
public interface IJwtTokenGenerator
{
    string GenerateToken(User user);
}
