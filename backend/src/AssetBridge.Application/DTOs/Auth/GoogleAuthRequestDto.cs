using System.ComponentModel.DataAnnotations;

namespace AssetBridge.Application.DTOs.Auth;

public class GoogleAuthRequestDto
{
    [Required(ErrorMessage = "Google ID token is required.")]
    public string IdToken { get; set; } = string.Empty;
}
