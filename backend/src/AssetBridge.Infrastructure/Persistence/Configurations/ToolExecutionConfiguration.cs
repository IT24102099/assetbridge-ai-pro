using AssetBridge.Domain.Entities.Workflow;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AssetBridge.Infrastructure.Persistence.Configurations;

public class ToolExecutionConfiguration : IEntityTypeConfiguration<ToolExecution>
{
    public void Configure(EntityTypeBuilder<ToolExecution> builder)
    {
        builder.ToTable("ToolExecutions");

        builder.HasKey(t => t.Id);

        builder.Property(t => t.ToolName)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(t => t.Status)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(t => t.StartedAtUtc)
            .IsRequired();

        builder.Property(t => t.InputSummary)
            .HasMaxLength(4000);

        builder.Property(t => t.OutputSummary)
            .HasMaxLength(4000);

        builder.Property(t => t.ValidationResult)
            .HasMaxLength(2000);

        builder.Property(t => t.ErrorMessage)
            .HasMaxLength(2000);

        builder.HasOne(t => t.AgentRun)
            .WithMany(a => a.ToolExecutions)
            .HasForeignKey(t => t.AgentRunId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(t => t.AgentRunId);
        builder.HasIndex(t => t.ToolName);
        builder.HasIndex(t => t.Status);
        builder.HasIndex(t => t.StartedAtUtc);
    }
}
