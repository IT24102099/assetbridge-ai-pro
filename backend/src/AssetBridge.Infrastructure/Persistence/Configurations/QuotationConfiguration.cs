using AssetBridge.Domain.Entities.Maintenance;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AssetBridge.Infrastructure.Persistence.Configurations;

public class QuotationConfiguration : IEntityTypeConfiguration<Quotation>
{
    public void Configure(EntityTypeBuilder<Quotation> builder)
    {
        builder.ToTable("Quotations");

        builder.HasKey(q => q.Id);

        builder.Property(q => q.ValidUntilUtc)
            .IsRequired();

        builder.Property(q => q.Notes)
            .HasMaxLength(1000);

        builder.Property(q => q.Subtotal)
            .IsRequired()
            .HasPrecision(18, 2);

        builder.Property(q => q.TaxAndOtherCharges)
            .IsRequired()
            .HasPrecision(18, 2);

        builder.Property(q => q.TotalAmount)
            .IsRequired()
            .HasPrecision(18, 2);

        builder.Property(q => q.Status)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(q => q.CreatedAtUtc)
            .IsRequired();

        builder.HasOne(q => q.Incident)
            .WithMany()
            .HasForeignKey(q => q.IncidentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(q => q.Provider)
            .WithMany()
            .HasForeignKey(q => q.ProviderId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(q => q.Items)
            .WithOne(i => i.Quotation)
            .HasForeignKey(i => i.QuotationId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(q => q.IncidentId);
        builder.HasIndex(q => q.ProviderId);
        builder.HasIndex(q => q.Status);
        builder.HasIndex(q => q.TotalAmount);
        builder.HasIndex(q => q.ValidUntilUtc);
    }
}
