using AssetBridge.Domain.Entities.Assets;
using AssetBridge.Domain.Entities.Incidents;
using AssetBridge.Domain.Entities.Providers;
using AssetBridge.Domain.Entities.Representatives;
using AssetBridge.Domain.Entities.Users;
using Microsoft.EntityFrameworkCore;

namespace AssetBridge.Application.Common.Interfaces;

// Decouples application service logic from concrete EF Core DbContext implementation.
public interface IApplicationDbContext
{
    DbSet<User> Users { get; }
    DbSet<Asset> Assets { get; }
    DbSet<Incident> Incidents { get; }
    DbSet<IncidentEvidence> IncidentEvidence { get; }
    DbSet<AssetHistory> AssetHistory { get; }

    DbSet<Representative> Representatives { get; }
    DbSet<ServiceProvider> ServiceProviders { get; }
    DbSet<ProviderSkill> ProviderSkills { get; }
    DbSet<ProviderAvailability> ProviderAvailability { get; }
    DbSet<ProviderHistory> ProviderHistory { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
