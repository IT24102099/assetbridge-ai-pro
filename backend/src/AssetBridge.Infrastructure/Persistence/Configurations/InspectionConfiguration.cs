using AssetBridge.Domain.Entities.Inspections;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AssetBridge.Infrastructure.Persistence.Configurations;

public class InspectionConfiguration : IEntityTypeConfiguration<Inspection>
{
    public void Configure(EntityTypeBuilder<Inspection> builder)
    {
        builder.ToTable("Inspections");

        builder.HasKey(i => i.Id);

        builder.Property(i => i.ScheduledAtUtc)
            .IsRequired();

        builder.Property(i => i.Status)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(i => i.Summary)
            .HasMaxLength(1000);

        builder.Property(i => i.Notes)
            .HasMaxLength(1000);

        builder.Property(i => i.EstimatedSeverity)
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(i => i.CreatedAtUtc)
            .IsRequired();

        // Foreign Key to Incident
        builder.HasOne(i => i.Incident)
            .WithMany()
            .HasForeignKey(i => i.IncidentId)
            .OnDelete(DeleteBehavior.Cascade);

        // Foreign Key to Inspector (ServiceProvider)
        builder.HasOne(i => i.InspectorProvider)
            .WithMany()
            .HasForeignKey(i => i.InspectorProviderId)
            .OnDelete(DeleteBehavior.Restrict);

        // Collection of findings
        builder.HasMany(i => i.Findings)
            .WithOne(f => f.Inspection)
            .HasForeignKey(f => f.InspectionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(i => i.IncidentId);
        builder.HasIndex(i => i.InspectorProviderId);
        builder.HasIndex(i => i.Status);
        builder.HasIndex(i => i.ScheduledAtUtc);
    }
}
