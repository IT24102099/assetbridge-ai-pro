using AssetBridge.Domain.Entities.Maintenance;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AssetBridge.Infrastructure.Persistence.Configurations;

public class MaintenanceHistoryConfiguration : IEntityTypeConfiguration<MaintenanceHistory>
{
    public void Configure(EntityTypeBuilder<MaintenanceHistory> builder)
    {
        builder.ToTable("MaintenanceHistory");

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

        builder.Property(h => h.RecordedCost)
            .HasPrecision(18, 2);

        builder.Property(h => h.CreatedAtUtc)
            .IsRequired();

        builder.HasOne(h => h.Asset)
            .WithMany()
            .HasForeignKey(h => h.AssetId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(h => h.Incident)
            .WithMany()
            .HasForeignKey(h => h.IncidentId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(h => h.MaintenanceJob)
            .WithMany()
            .HasForeignKey(h => h.MaintenanceJobId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(h => h.AssetId);
        builder.HasIndex(h => h.IncidentId);
        builder.HasIndex(h => h.MaintenanceJobId);
        builder.HasIndex(h => h.EventType);
        builder.HasIndex(h => h.CreatedAtUtc);
    }
}
