using AssetBridge.Domain.Entities.Workflow;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AssetBridge.Infrastructure.Persistence.Configurations;

public class WorkflowInstanceConfiguration : IEntityTypeConfiguration<WorkflowInstance>
{
    public void Configure(EntityTypeBuilder<WorkflowInstance> builder)
    {
        builder.ToTable("WorkflowInstances");

        builder.HasKey(w => w.Id);

        builder.Property(w => w.CurrentState)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(w => w.FailureReason)
            .HasMaxLength(1000);

        builder.Property(w => w.CorrelationId)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(w => w.CreatedAtUtc)
            .IsRequired();

        builder.HasOne(w => w.Incident)
            .WithMany()
            .HasForeignKey(w => w.IncidentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(w => w.CreatedByUser)
            .WithMany()
            .HasForeignKey(w => w.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(w => w.Steps)
            .WithOne(s => s.WorkflowInstance)
            .HasForeignKey(s => s.WorkflowInstanceId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(w => w.ApprovalRequests)
            .WithOne(a => a.WorkflowInstance)
            .HasForeignKey(a => a.WorkflowInstanceId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(w => w.AgentRuns)
            .WithOne(a => a.WorkflowInstance)
            .HasForeignKey(a => a.WorkflowInstanceId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(w => w.AuditEvents)
            .WithOne(a => a.WorkflowInstance)
            .HasForeignKey(a => a.WorkflowInstanceId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(w => w.FollowUpTasks)
            .WithOne(f => f.WorkflowInstance)
            .HasForeignKey(f => f.WorkflowInstanceId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(w => w.IncidentId);
        builder.HasIndex(w => w.CurrentState);
        builder.HasIndex(w => w.CorrelationId);
        builder.HasIndex(w => w.CreatedAtUtc);
    }
}
