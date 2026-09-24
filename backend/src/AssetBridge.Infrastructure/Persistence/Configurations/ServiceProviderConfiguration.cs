using AssetBridge.Domain.Entities.Providers;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AssetBridge.Infrastructure.Persistence.Configurations;

// Defines PostgreSQL database mappings, constraints, and indexes for ServiceProviders.
public class ServiceProviderConfiguration : IEntityTypeConfiguration<ServiceProvider>
{
    public void Configure(EntityTypeBuilder<ServiceProvider> builder)
    {
        builder.ToTable("ServiceProviders");

        builder.HasKey(p => p.Id);

        builder.Property(p => p.BusinessName)
            .IsRequired()
            .HasMaxLength(150);

        builder.Property(p => p.ContactPerson)
            .IsRequired()
            .HasMaxLength(150);

        builder.Property(p => p.PhoneNumber)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(p => p.Email)
            .IsRequired()
            .HasMaxLength(150);

        builder.Property(p => p.PrimaryDistrict)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(p => p.City)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(p => p.Address)
            .HasMaxLength(300);

        builder.Property(p => p.ServiceRadiusKm)
            .IsRequired()
            .HasDefaultValue(30.0);

        builder.Property(p => p.VerificationStatus)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(p => p.VerificationNotes)
            .HasMaxLength(500);

        builder.Property(p => p.Rating)
            .IsRequired()
            .HasDefaultValue(5.0);

        builder.Property(p => p.CompletedJobsCount)
            .IsRequired()
            .HasDefaultValue(0);

        builder.Property(p => p.IsActive)
            .IsRequired()
            .HasDefaultValue(true);

        builder.Property(p => p.CreatedAtUtc)
            .IsRequired();

        // Foreign Key to User identity
        builder.HasOne(p => p.User)
            .WithMany()
            .HasForeignKey(p => p.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        // Navigation collections with cascade delete
        builder.HasMany(p => p.Skills)
            .WithOne(s => s.Provider)
            .HasForeignKey(s => s.ProviderId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(p => p.AvailabilitySlots)
            .WithOne(a => a.Provider)
            .HasForeignKey(a => a.ProviderId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(p => p.HistoryEntries)
            .WithOne(h => h.Provider)
            .HasForeignKey(h => h.ProviderId)
            .OnDelete(DeleteBehavior.Cascade);

        // Unique constraint: one service provider profile per user account
        builder.HasIndex(p => p.UserId)
            .IsUnique();

        builder.HasIndex(p => p.PrimaryDistrict);
        builder.HasIndex(p => p.City);
        builder.HasIndex(p => p.VerificationStatus);
        builder.HasIndex(p => p.IsActive);
        builder.HasIndex(p => p.Rating);
    }
}
