using AssetBridge.Domain.Entities.Providers;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AssetBridge.Infrastructure.Persistence.Configurations;

// Defines PostgreSQL database mappings and indexes for ProviderAvailability.
public class ProviderAvailabilityConfiguration : IEntityTypeConfiguration<ProviderAvailability>
{
    public void Configure(EntityTypeBuilder<ProviderAvailability> builder)
    {
        builder.ToTable("ProviderAvailability");

        builder.HasKey(a => a.Id);

        builder.Property(a => a.AvailableDateUtc)
            .IsRequired();

        builder.Property(a => a.StartTime)
            .IsRequired();

        builder.Property(a => a.EndTime)
            .IsRequired();

        builder.Property(a => a.Status)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(a => a.Notes)
            .HasMaxLength(500);

        builder.Property(a => a.CreatedAtUtc)
            .IsRequired();

        // Foreign Key to Provider
        builder.HasOne(a => a.Provider)
            .WithMany(p => p.AvailabilitySlots)
            .HasForeignKey(a => a.ProviderId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(a => a.ProviderId);
        builder.HasIndex(a => a.AvailableDateUtc);
        builder.HasIndex(a => a.Status);
    }
}
