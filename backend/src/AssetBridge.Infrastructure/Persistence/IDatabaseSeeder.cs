namespace AssetBridge.Infrastructure.Persistence;

public interface IDatabaseSeeder
{
    Task SeedAsync(CancellationToken cancellationToken = default);
}
