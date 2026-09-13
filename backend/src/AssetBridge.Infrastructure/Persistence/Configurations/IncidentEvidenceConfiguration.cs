using AssetBridge.Domain.Entities.Incidents;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AssetBridge.Infrastructure.Persistence.Configurations;

// Fluent API configuration for IncidentEvidence table.
public class IncidentEvidenceConfiguration : IEntityTypeConfiguration<IncidentEvidence>
{
    public void Configure(EntityTypeBuilder<IncidentEvidence> builder)
    {
        builder.ToTable("IncidentEvidence");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.FileUrl)
            .IsRequired()
            .HasMaxLength(1000);

        builder.Property(e => e.FileName)
            .IsRequired()
            .HasMaxLength(255);

        builder.Property(e => e.FileType)
            .HasMaxLength(100);

        builder.Property(e => e.EvidenceType)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(e => e.Caption)
            .HasMaxLength(500);

        builder.Property(e => e.CreatedAtUtc)
            .IsRequired();

        // Foreign Key to Incident
        builder.HasOne(e => e.Incident)
            .WithMany(i => i.EvidenceItems)
            .HasForeignKey(e => e.IncidentId)
            .OnDelete(DeleteBehavior.Cascade);

        // Foreign Key to Uploader (User)
        builder.HasOne(e => e.UploadedByUser)
            .WithMany()
            .HasForeignKey(e => e.UploadedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(e => e.IncidentId);
    }
}
