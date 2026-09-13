using AssetBridge.Domain.Entities.Maintenance;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AssetBridge.Infrastructure.Persistence.Configurations;

public class MaintenanceJobConfiguration : IEntityTypeConfiguration<MaintenanceJob>
{
    public void Configure(EntityTypeBuilder<MaintenanceJob> builder)
    {
        builder.ToTable("MaintenanceJobs");

        builder.HasKey(j => j.Id);

        builder.Property(j => j.Title)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(j => j.Description)
            .IsRequired()
            .HasMaxLength(2000);

        builder.Property(j => j.ScheduledStartUtc)
            .IsRequired();

        builder.Property(j => j.ScheduledEndUtc)
            .IsRequired();

        builder.Property(j => j.Status)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(j => j.ApprovedBudget)
            .IsRequired()
            .HasPrecision(18, 2);

        builder.Property(j => j.ActualCost)
            .HasPrecision(18, 2);

        builder.Property(j => j.CompletionNotes)
            .HasMaxLength(1000);

        builder.Property(j => j.CreatedAtUtc)
            .IsRequired();

        builder.HasOne(j => j.Incident)
            .WithMany()
            .HasForeignKey(j => j.IncidentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(j => j.Provider)
            .WithMany()
            .HasForeignKey(j => j.ProviderId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(j => j.Inspection)
            .WithMany()
            .HasForeignKey(j => j.InspectionId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(j => j.IncidentId);
        builder.HasIndex(j => j.ProviderId);
        builder.HasIndex(j => j.InspectionId);
        builder.HasIndex(j => j.Status);
        builder.HasIndex(j => j.ScheduledStartUtc);
    }
}
