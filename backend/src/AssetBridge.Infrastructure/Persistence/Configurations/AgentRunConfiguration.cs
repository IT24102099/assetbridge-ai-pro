using AssetBridge.Domain.Entities.Workflow;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AssetBridge.Infrastructure.Persistence.Configurations;

public class AgentRunConfiguration : IEntityTypeConfiguration<AgentRun>
{
    public void Configure(EntityTypeBuilder<AgentRun> builder)
    {
        builder.ToTable("AgentRuns");

        builder.HasKey(a => a.Id);

        builder.Property(a => a.AgentName)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(a => a.AgentType)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(a => a.Status)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(a => a.StartedAtUtc)
            .IsRequired();

        builder.Property(a => a.InputSummary)
            .HasMaxLength(4000);

        builder.Property(a => a.OutputSummary)
            .HasMaxLength(4000);

        builder.Property(a => a.ErrorMessage)
            .HasMaxLength(2000);

        builder.Property(a => a.CorrelationId)
            .IsRequired()
            .HasMaxLength(100);

        builder.HasOne(a => a.WorkflowInstance)
            .WithMany(w => w.AgentRuns)
            .HasForeignKey(a => a.WorkflowInstanceId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(a => a.ToolExecutions)
            .WithOne(t => t.AgentRun)
            .HasForeignKey(t => t.AgentRunId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(a => a.WorkflowInstanceId);
        builder.HasIndex(a => a.AgentType);
        builder.HasIndex(a => a.Status);
        builder.HasIndex(a => a.StartedAtUtc);
        builder.HasIndex(a => a.CorrelationId);
    }
}
