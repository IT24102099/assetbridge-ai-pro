using AssetBridge.Domain.Entities.Assets;
using AssetBridge.Domain.Entities.Incidents;
using AssetBridge.Domain.Entities.Users;
using Microsoft.EntityFrameworkCore;

namespace AssetBridge.Application.Common.Interfaces;

// Decouples application service logic from concrete EF Core DbContext implementation.
// This interface allows services to query and persist entities while supporting
// in-memory test doubles and mocking during unit/integration tests.
public interface IApplicationDbContext
{
    DbSet<User> Users { get; }
    DbSet<Asset> Assets { get; }
    DbSet<Incident> Incidents { get; }
    DbSet<IncidentEvidence> IncidentEvidence { get; }
    DbSet<AssetHistory> AssetHistory { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
