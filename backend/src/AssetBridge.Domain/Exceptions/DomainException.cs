namespace AssetBridge.Domain.Exceptions;

// Base exception for domain-level business rule violations.
// Throwing typed domain exceptions allows the global exception middleware
// to translate business rule violations into appropriate HTTP status codes (e.g. 400/422).
public class DomainException : Exception
{
    public DomainException(string message) : base(message)
    {
    }

    public DomainException(string message, Exception innerException) : base(message, innerException)
    {
    }
}
