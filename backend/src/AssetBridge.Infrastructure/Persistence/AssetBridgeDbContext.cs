using System.Reflection;
using AssetBridge.Application.Common.Interfaces;
using AssetBridge.Domain.Entities.Assets;
using AssetBridge.Domain.Entities.Common;
using AssetBridge.Domain.Entities.Incidents;
using AssetBridge.Domain.Entities.Users;
using Microsoft.EntityFrameworkCore;

namespace AssetBridge.Infrastructure.Persistence;

// Primary Entity Framework Core database context for AssetBridge AI.
// Manages database connection, entity mapping, and automated audit timestamp tracking.
public class AssetBridgeDbContext : DbContext, IApplicationDbContext
{
    public AssetBridgeDbContext(DbContextOptions<AssetBridgeDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Asset> Assets => Set<Asset>();
    public DbSet<Incident> Incidents => Set<Incident>();
    public DbSet<IncidentEvidence> IncidentEvidence => Set<IncidentEvidence>();
    public DbSet<AssetHistory> AssetHistory => Set<AssetHistory>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Automatically applies all entity configurations defined in this assembly
        modelBuilder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        // Automatically updates audit timestamps for modified entities before persisting
        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            switch (entry.State)
            {
                case EntityState.Added:
                    if (entry.Entity.CreatedAtUtc == default)
                    {
                        entry.Entity.CreatedAtUtc = DateTime.UtcNow;
                    }
                    break;

                case EntityState.Modified:
                    entry.Entity.UpdatedAtUtc = DateTime.UtcNow;
                    break;
            }
        }

        return base.SaveChangesAsync(cancellationToken);
    }
}
