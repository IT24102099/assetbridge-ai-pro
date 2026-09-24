using AssetBridge.Domain.Entities.Workflow;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AssetBridge.Infrastructure.Persistence.Configurations;

public class FollowUpTaskConfiguration : IEntityTypeConfiguration<FollowUpTask>
{
    public void Configure(EntityTypeBuilder<FollowUpTask> builder)
    {
        builder.ToTable("FollowUpTasks");

        builder.HasKey(f => f.Id);

        builder.Property(f => f.Title)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(f => f.Description)
            .IsRequired()
            .HasMaxLength(2000);

        builder.Property(f => f.DueDateUtc)
            .IsRequired();

        builder.Property(f => f.Status)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(f => f.Priority)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(f => f.CreatedAtUtc)
            .IsRequired();

        builder.HasOne(f => f.WorkflowInstance)
            .WithMany(w => w.FollowUpTasks)
            .HasForeignKey(f => f.WorkflowInstanceId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(f => f.Asset)
            .WithMany()
            .HasForeignKey(f => f.AssetId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(f => f.AssignedToUser)
            .WithMany()
            .HasForeignKey(f => f.AssignedToUserId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(f => f.WorkflowInstanceId);
        builder.HasIndex(f => f.AssetId);
        builder.HasIndex(f => f.Status);
        builder.HasIndex(f => f.DueDateUtc);
        builder.HasIndex(f => f.AssignedToUserId);
    }
}
