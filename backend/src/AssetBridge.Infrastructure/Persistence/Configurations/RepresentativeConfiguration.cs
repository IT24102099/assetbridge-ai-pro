using AssetBridge.Domain.Entities.Representatives;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AssetBridge.Infrastructure.Persistence.Configurations;

// Defines PostgreSQL database mappings, constraints, and indexes for Representatives.
public class RepresentativeConfiguration : IEntityTypeConfiguration<Representative>
{
    public void Configure(EntityTypeBuilder<Representative> builder)
    {
        builder.ToTable("Representatives");

        builder.HasKey(r => r.Id);

        builder.Property(r => r.FullName)
            .IsRequired()
            .HasMaxLength(150);

        builder.Property(r => r.PhoneNumber)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(r => r.Email)
            .IsRequired()
            .HasMaxLength(150);

        builder.Property(r => r.District)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(r => r.City)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(r => r.Address)
            .HasMaxLength(300);

        builder.Property(r => r.NationalIdNumber)
            .HasMaxLength(50);

        builder.Property(r => r.Bio)
            .HasMaxLength(1000);

        builder.Property(r => r.VerificationStatus)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(r => r.VerificationNotes)
            .HasMaxLength(500);

        builder.Property(r => r.IsActive)
            .IsRequired()
            .HasDefaultValue(true);

        builder.Property(r => r.CreatedAtUtc)
            .IsRequired();

        // Foreign Key to User identity
        builder.HasOne(r => r.User)
            .WithMany()
            .HasForeignKey(r => r.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        // Unique constraint: one representative profile per user account
        builder.HasIndex(r => r.UserId)
            .IsUnique();

        builder.HasIndex(r => r.District);
        builder.HasIndex(r => r.City);
        builder.HasIndex(r => r.VerificationStatus);
        builder.HasIndex(r => r.IsActive);
    }
}
