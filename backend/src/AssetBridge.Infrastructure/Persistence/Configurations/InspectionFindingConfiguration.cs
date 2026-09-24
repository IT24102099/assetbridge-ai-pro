using AssetBridge.Domain.Entities.Inspections;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AssetBridge.Infrastructure.Persistence.Configurations;

public class InspectionFindingConfiguration : IEntityTypeConfiguration<InspectionFinding>
{
    public void Configure(EntityTypeBuilder<InspectionFinding> builder)
    {
        builder.ToTable("InspectionFindings");

        builder.HasKey(f => f.Id);

        builder.Property(f => f.Description)
            .IsRequired()
            .HasMaxLength(1000);

        builder.Property(f => f.Severity)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(f => f.Recommendation)
            .IsRequired()
            .HasMaxLength(1000);

        builder.Property(f => f.EvidenceReference)
            .HasMaxLength(500);

        builder.Property(f => f.CreatedAtUtc)
            .IsRequired();

        builder.HasOne(f => f.Inspection)
            .WithMany(i => i.Findings)
            .HasForeignKey(f => f.InspectionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(f => f.InspectionId);
        builder.HasIndex(f => f.Severity);
    }
}
