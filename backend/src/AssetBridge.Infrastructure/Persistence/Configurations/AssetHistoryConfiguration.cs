using AssetBridge.Domain.Entities.Assets;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AssetBridge.Infrastructure.Persistence.Configurations;

// Fluent API configuration for AssetHistory table.
public class AssetHistoryConfiguration : IEntityTypeConfiguration<AssetHistory>
{
    public void Configure(EntityTypeBuilder<AssetHistory> builder)
    {
        builder.ToTable("AssetHistory");

        builder.HasKey(h => h.Id);

        builder.Property(h => h.EventType)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(h => h.EventTitle)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(h => h.EventDescription)
            .IsRequired()
            .HasMaxLength(2000);

        builder.Property(h => h.CreatedAtUtc)
            .IsRequired();

        // Foreign Key to Asset
        builder.HasOne(h => h.Asset)
            .WithMany(a => a.HistoryEntries)
            .HasForeignKey(h => h.AssetId)
            .OnDelete(DeleteBehavior.Cascade);

        // Foreign Key to Actor (User)
        builder.HasOne(h => h.PerformedByUser)
            .WithMany()
            .HasForeignKey(h => h.PerformedByUserId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(h => h.AssetId);
        builder.HasIndex(h => h.CreatedAtUtc);
    }
}
