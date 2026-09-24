namespace AssetBridge.Domain.Exceptions;

// Thrown when a requested entity does not exist in the database.
// Handled by API middleware to automatically return an HTTP 404 (Not Found) response.
public class EntityNotFoundException : DomainException
{
    public string EntityName { get; }
    public object Key { get; }

    public EntityNotFoundException(string entityName, object key)
        : base($"Entity '{entityName}' with identifier '{key}' was not found.")
    {
        EntityName = entityName;
        Key = key;
    }
}
