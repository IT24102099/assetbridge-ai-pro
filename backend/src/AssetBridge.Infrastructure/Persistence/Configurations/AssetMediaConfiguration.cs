using AssetBridge.Domain.Entities.Assets;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AssetBridge.Infrastructure.Persistence.Configurations;

// Fluent API configuration establishing database constraints and foreign key rules for the AssetMedia table.
public class AssetMediaConfiguration : IEntityTypeConfiguration<AssetMedia>
{
    public void Configure(EntityTypeBuilder<AssetMedia> builder)
    {
        builder.ToTable("AssetMedia");

        builder.HasKey(m => m.Id);

        builder.Property(m => m.FileName)
            .IsRequired()
            .HasMaxLength(255);

        builder.Property(m => m.FileUrl)
            .IsRequired()
            .HasMaxLength(2000);

        builder.Property(m => m.FileType)
            .HasMaxLength(100);

        builder.Property(m => m.FileSizeBytes)
            .IsRequired();

        builder.Property(m => m.IsThumbnail)
            .IsRequired()
            .HasDefaultValue(false);

        builder.Property(m => m.Caption)
            .HasMaxLength(500);

        builder.Property(m => m.CreatedAtUtc)
            .IsRequired();

        // Foreign Key to Asset
        builder.HasOne(m => m.Asset)
            .WithMany(a => a.Media)
            .HasForeignKey(m => m.AssetId)
            .OnDelete(DeleteBehavior.Cascade);

        // Foreign Key to UploadedByUser
        builder.HasOne(m => m.UploadedByUser)
            .WithMany()
            .HasForeignKey(m => m.UploadedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        // Indexes for performance and lookup
        builder.HasIndex(m => m.AssetId);
        builder.HasIndex(m => new { m.AssetId, m.IsThumbnail });
    }
}
