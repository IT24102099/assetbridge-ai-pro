using AssetBridge.Domain.Entities.Assets;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AssetBridge.Infrastructure.Persistence.Configurations;

// Fluent API configuration establishing database constraints, indexes, and relationships for the Assets table.
public class AssetConfiguration : IEntityTypeConfiguration<Asset>
{
    public void Configure(EntityTypeBuilder<Asset> builder)
    {
        builder.ToTable("Assets");

        builder.HasKey(a => a.Id);

        builder.Property(a => a.Name)
            .IsRequired()
            .HasMaxLength(150);

        builder.Property(a => a.PropertyType)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(a => a.AddressLine1)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(a => a.AddressLine2)
            .HasMaxLength(200);

        builder.Property(a => a.City)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(a => a.District)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(a => a.PostalCode)
            .HasMaxLength(20);

        builder.Property(a => a.Description)
            .HasMaxLength(1000);

        builder.Property(a => a.Status)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(a => a.CreatedAtUtc)
            .IsRequired();

        // Foreign Key to Owner (User)
        builder.HasOne(a => a.Owner)
            .WithMany()
            .HasForeignKey(a => a.OwnerId)
            .OnDelete(DeleteBehavior.Restrict);

        // Indexes for fast querying, location filtering, and owner queries
        builder.HasIndex(a => a.OwnerId);
        builder.HasIndex(a => a.City);
        builder.HasIndex(a => a.District);
        builder.HasIndex(a => a.Status);
    }
}
