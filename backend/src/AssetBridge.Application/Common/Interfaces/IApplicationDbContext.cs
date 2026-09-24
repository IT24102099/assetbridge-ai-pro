using AssetBridge.Domain.Entities.Assets;
using AssetBridge.Domain.Entities.Incidents;
using AssetBridge.Domain.Entities.Providers;
using AssetBridge.Domain.Entities.Representatives;
using AssetBridge.Domain.Entities.Users;
using Microsoft.EntityFrameworkCore;

namespace AssetBridge.Application.Common.Interfaces;

// Decouples application service logic from concrete EF Core DbContext implementation.
public interface IApplicationDbContext
{
    DbSet<User> Users { get; }
    DbSet<Asset> Assets { get; }
    DbSet<AssetMedia> AssetMedia { get; }
    DbSet<Incident> Incidents { get; }
    DbSet<IncidentEvidence> IncidentEvidence { get; }
    DbSet<AssetHistory> AssetHistory { get; }

    DbSet<Representative> Representatives { get; }
    DbSet<ServiceProvider> ServiceProviders { get; }
    DbSet<ProviderSkill> ProviderSkills { get; }
    DbSet<ProviderAvailability> ProviderAvailability { get; }
    DbSet<ProviderHistory> ProviderHistory { get; }

    // Member 3: Maintenance, Inspection & Quotations
    DbSet<Domain.Entities.Inspections.Inspection> Inspections { get; }
    DbSet<Domain.Entities.Inspections.InspectionFinding> InspectionFindings { get; }
    DbSet<Domain.Entities.Maintenance.MaintenanceJob> MaintenanceJobs { get; }
    DbSet<Domain.Entities.Maintenance.Quotation> Quotations { get; }
    DbSet<Domain.Entities.Maintenance.QuotationItem> QuotationItems { get; }
    DbSet<Domain.Entities.Maintenance.MaintenanceHistory> MaintenanceHistory { get; }

    // Member 4: Workflow, Approval, Audit & Continuity
    DbSet<Domain.Entities.Workflow.WorkflowInstance> WorkflowInstances { get; }
    DbSet<Domain.Entities.Workflow.WorkflowStep> WorkflowSteps { get; }
    DbSet<Domain.Entities.Workflow.ApprovalRequest> ApprovalRequests { get; }
    DbSet<Domain.Entities.Workflow.AgentRun> AgentRuns { get; }
    DbSet<Domain.Entities.Workflow.ToolExecution> ToolExecutions { get; }
    DbSet<Domain.Entities.Workflow.AuditEvent> AuditEvents { get; }
    DbSet<Domain.Entities.Workflow.FollowUpTask> FollowUpTasks { get; }
    DbSet<Domain.Entities.Workflow.Notification> Notifications { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
