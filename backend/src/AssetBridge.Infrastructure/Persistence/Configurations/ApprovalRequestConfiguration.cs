using AssetBridge.Domain.Entities.Workflow;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AssetBridge.Infrastructure.Persistence.Configurations;

public class ApprovalRequestConfiguration : IEntityTypeConfiguration<ApprovalRequest>
{
    public void Configure(EntityTypeBuilder<ApprovalRequest> builder)
    {
        builder.ToTable("ApprovalRequests");

        builder.HasKey(a => a.Id);

        builder.Property(a => a.Status)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(a => a.Decision)
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(a => a.DecisionReason)
            .HasMaxLength(1000);

        builder.Property(a => a.RevisionComment)
            .HasMaxLength(2000);

        builder.Property(a => a.RequestedAtUtc)
            .IsRequired();

        builder.HasOne(a => a.WorkflowInstance)
            .WithMany(w => w.ApprovalRequests)
            .HasForeignKey(a => a.WorkflowInstanceId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(a => a.RequestedByUser)
            .WithMany()
            .HasForeignKey(a => a.RequestedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(a => a.AssignedApproverUser)
            .WithMany()
            .HasForeignKey(a => a.AssignedApproverUserId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(a => a.WorkflowInstanceId);
        builder.HasIndex(a => a.RequestedByUserId);
        builder.HasIndex(a => a.AssignedApproverUserId);
        builder.HasIndex(a => a.Status);
        builder.HasIndex(a => a.RequestedAtUtc);
    }
}
