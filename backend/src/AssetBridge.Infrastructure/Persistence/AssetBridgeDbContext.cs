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

    // Member 2: Representative & Service Provider Coordination
    public DbSet<Domain.Entities.Representatives.Representative> Representatives => Set<Domain.Entities.Representatives.Representative>();
    public DbSet<Domain.Entities.Providers.ServiceProvider> ServiceProviders => Set<Domain.Entities.Providers.ServiceProvider>();
    public DbSet<Domain.Entities.Providers.ProviderSkill> ProviderSkills => Set<Domain.Entities.Providers.ProviderSkill>();
    public DbSet<Domain.Entities.Providers.ProviderAvailability> ProviderAvailability => Set<Domain.Entities.Providers.ProviderAvailability>();
    public DbSet<Domain.Entities.Providers.ProviderHistory> ProviderHistory => Set<Domain.Entities.Providers.ProviderHistory>();

    // Member 3: Maintenance, Inspection & Quotations
    public DbSet<Domain.Entities.Inspections.Inspection> Inspections => Set<Domain.Entities.Inspections.Inspection>();
    public DbSet<Domain.Entities.Inspections.InspectionFinding> InspectionFindings => Set<Domain.Entities.Inspections.InspectionFinding>();
    public DbSet<Domain.Entities.Maintenance.MaintenanceJob> MaintenanceJobs => Set<Domain.Entities.Maintenance.MaintenanceJob>();
    public DbSet<Domain.Entities.Maintenance.Quotation> Quotations => Set<Domain.Entities.Maintenance.Quotation>();
    public DbSet<Domain.Entities.Maintenance.QuotationItem> QuotationItems => Set<Domain.Entities.Maintenance.QuotationItem>();
    public DbSet<Domain.Entities.Maintenance.MaintenanceHistory> MaintenanceHistory => Set<Domain.Entities.Maintenance.MaintenanceHistory>();

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
