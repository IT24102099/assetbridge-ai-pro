using AssetBridge.Domain.Entities.Providers;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AssetBridge.Infrastructure.Persistence.Configurations;

// Defines PostgreSQL database mappings and indexes for ProviderSkills.
public class ProviderSkillConfiguration : IEntityTypeConfiguration<ProviderSkill>
{
    public void Configure(EntityTypeBuilder<ProviderSkill> builder)
    {
        builder.ToTable("ProviderSkills");

        builder.HasKey(s => s.Id);

        builder.Property(s => s.Category)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(s => s.SkillName)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(s => s.YearsOfExperience)
            .IsRequired()
            .HasDefaultValue(0);

        builder.Property(s => s.LicenseNumber)
            .HasMaxLength(100);

        builder.Property(s => s.IsPrimary)
            .IsRequired()
            .HasDefaultValue(false);

        builder.Property(s => s.Notes)
            .HasMaxLength(500);

        builder.Property(s => s.CreatedAtUtc)
            .IsRequired();

        // Foreign Key to Provider
        builder.HasOne(s => s.Provider)
            .WithMany(p => p.Skills)
            .HasForeignKey(s => s.ProviderId)
            .OnDelete(DeleteBehavior.Cascade);

        // Indexes for rapid matching query lookups
        builder.HasIndex(s => s.ProviderId);
        builder.HasIndex(s => s.Category);
        builder.HasIndex(s => new { s.ProviderId, s.Category, s.SkillName }).IsUnique();
    }
}
