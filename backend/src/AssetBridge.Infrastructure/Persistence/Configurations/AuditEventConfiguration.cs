using AssetBridge.Domain.Entities.Workflow;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AssetBridge.Infrastructure.Persistence.Configurations;

public class AuditEventConfiguration : IEntityTypeConfiguration<AuditEvent>
{
    public void Configure(EntityTypeBuilder<AuditEvent> builder)
    {
        builder.ToTable("AuditEvents");

        builder.HasKey(a => a.Id);

        builder.Property(a => a.EventType)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(a => a.Description)
            .IsRequired()
            .HasMaxLength(1000);

        builder.Property(a => a.CorrelationId)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(a => a.CreatedAtUtc)
            .IsRequired();

        builder.HasOne(a => a.WorkflowInstance)
            .WithMany(w => w.AuditEvents)
            .HasForeignKey(a => a.WorkflowInstanceId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(a => a.User)
            .WithMany()
            .HasForeignKey(a => a.UserId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(a => a.WorkflowInstanceId);
        builder.HasIndex(a => a.UserId);
        builder.HasIndex(a => a.EventType);
        builder.HasIndex(a => a.CreatedAtUtc);
        builder.HasIndex(a => a.CorrelationId);
    }
}
