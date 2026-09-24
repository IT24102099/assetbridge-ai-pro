using AssetBridge.Domain.Entities.Workflow;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AssetBridge.Infrastructure.Persistence.Configurations;

public class WorkflowStepConfiguration : IEntityTypeConfiguration<WorkflowStep>
{
    public void Configure(EntityTypeBuilder<WorkflowStep> builder)
    {
        builder.ToTable("WorkflowSteps");

        builder.HasKey(s => s.Id);

        builder.Property(s => s.StepState)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(s => s.Status)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(s => s.StartedAtUtc)
            .IsRequired();

        builder.Property(s => s.StartedBy)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(s => s.CompletedBy)
            .HasMaxLength(100);

        builder.Property(s => s.Notes)
            .HasMaxLength(2000);

        builder.Property(s => s.ErrorMessage)
            .HasMaxLength(2000);

        builder.HasOne(s => s.WorkflowInstance)
            .WithMany(w => w.Steps)
            .HasForeignKey(s => s.WorkflowInstanceId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(s => s.WorkflowInstanceId);
        builder.HasIndex(s => s.StepState);
        builder.HasIndex(s => s.Status);
        builder.HasIndex(s => s.StartedAtUtc);
    }
}
