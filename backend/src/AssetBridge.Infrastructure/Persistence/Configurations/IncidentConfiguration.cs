using AssetBridge.Domain.Entities.Incidents;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AssetBridge.Infrastructure.Persistence.Configurations;

// Fluent API configuration establishing database constraints, indexes, and relationships for the Incidents table.
public class IncidentConfiguration : IEntityTypeConfiguration<Incident>
{
    public void Configure(EntityTypeBuilder<Incident> builder)
    {
        builder.ToTable("Incidents");

        builder.HasKey(i => i.Id);

        builder.Property(i => i.Title)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(i => i.Description)
            .IsRequired()
            .HasMaxLength(4000);

        builder.Property(i => i.Category)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(i => i.Priority)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(i => i.Status)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(50);

        // Explicit decimal precision for Sri Lankan Rupee (LKR) financial estimates
        builder.Property(i => i.EstimatedBudget)
            .HasColumnType("decimal(18,2)");

        builder.Property(i => i.LocationDetails)
            .HasMaxLength(250);

        builder.Property(i => i.CreatedAtUtc)
            .IsRequired();

        // Foreign Key to Asset
        builder.HasOne(i => i.Asset)
            .WithMany(a => a.Incidents)
            .HasForeignKey(i => i.AssetId)
            .OnDelete(DeleteBehavior.Cascade);

        // Foreign Key to Reporter (User)
        builder.HasOne(i => i.ReportedByUser)
            .WithMany()
            .HasForeignKey(i => i.ReportedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        // Indexes for incident filtering, category/priority routing, and status monitoring
        builder.HasIndex(i => i.AssetId);
        builder.HasIndex(i => i.ReportedByUserId);
        builder.HasIndex(i => i.Category);
        builder.HasIndex(i => i.Priority);
        builder.HasIndex(i => i.Status);
    }
}
