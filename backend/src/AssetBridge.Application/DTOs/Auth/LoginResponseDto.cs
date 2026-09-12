namespace AssetBridge.Application.DTOs.Auth;

// Returned upon successful authentication to provide the client with a bearer JWT
// along with the essential user profile required for client-side routing and display.
public class LoginResponseDto
{
    public string Token { get; set; } = string.Empty;
    public string TokenType { get; set; } = "Bearer";
    public int ExpiresInMinutes { get; set; }
    public UserProfileDto User { get; set; } = null!;
}
