using System.ComponentModel.DataAnnotations;

namespace AssetBridge.Application.DTOs.Auth;

// Carries login credentials submitted by React or Flutter client.
// Server-side DataAnnotations provide immediate model validation before reaching service logic.
public class LoginRequestDto
{
    [Required(ErrorMessage = "Email is required.")]
    [EmailAddress(ErrorMessage = "A valid email address is required.")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Password is required.")]
    [MinLength(6, ErrorMessage = "Password must be at least 6 characters.")]
    public string Password { get; set; } = string.Empty;
}
