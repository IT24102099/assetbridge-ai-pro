using System.Text.RegularExpressions;

namespace AssetBridge.Application.Common.Validation;

public static class ValidationRules
{
    private static readonly Regex EmailRegex = new(
        @"^[^@\s]+@[^@\s]+\.[^@\s]+$",
        RegexOptions.Compiled | RegexOptions.IgnoreCase,
        TimeSpan.FromMilliseconds(250));

    public static bool IsValidEmail(string? email)
    {
        if (string.IsNullOrWhiteSpace(email))
            return false;

        var trimmed = email.Trim();
        if (trimmed.Length < 5 || trimmed.Length > 254)
            return false;

        try
        {
            return EmailRegex.IsMatch(trimmed);
        }
        catch (RegexMatchTimeoutException)
        {
            return false;
        }
    }
}
