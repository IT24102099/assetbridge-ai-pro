namespace AssetBridge.Domain.Exceptions;

// Exception thrown when an authenticated user attempts an operation or accesses a resource
// for which they do not possess sufficient authorization/permissions (HTTP 403 Forbidden).
public class ForbiddenAccessException : Exception
{
    public ForbiddenAccessException() : base("You are not authorized to perform this action.")
    {
    }

    public ForbiddenAccessException(string message) : base(message)
    {
    }

    public ForbiddenAccessException(string message, Exception innerException) : base(message, innerException)
    {
    }
}
