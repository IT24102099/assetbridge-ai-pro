using AssetBridge.Domain.Entities.Providers;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AssetBridge.Infrastructure.Persistence.Configurations;

// Defines PostgreSQL database mappings and indexes for ProviderHistory.
public class ProviderHistoryConfiguration : IEntityTypeConfiguration<ProviderHistory>
{
    public void Configure(EntityTypeBuilder<ProviderHistory> builder)
    {
        builder.ToTable("ProviderHistory");

        builder.HasKey(h => h.Id);

        builder.Property(h => h.EventType)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(h => h.Title)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(h => h.Description)
            .IsRequired()
            .HasMaxLength(1000);

        builder.Property(h => h.CreatedAtUtc)
            .IsRequired();

        // Foreign Key to Provider
        builder.HasOne(h => h.Provider)
            .WithMany(p => p.HistoryEntries)
            .HasForeignKey(h => h.ProviderId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(h => h.ProviderId);
        builder.HasIndex(h => h.EventType);
        builder.HasIndex(h => h.RelatedIncidentId);
    }
}
