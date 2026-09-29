using AssetBridge.Application.DTOs.Workflow;
using AssetBridge.Application.Services.Implementations;
using AssetBridge.Domain.Entities.Assets;
using AssetBridge.Domain.Entities.Incidents;
using AssetBridge.Domain.Entities.Users;
using AssetBridge.Domain.Entities.Workflow;
using AssetBridge.Domain.Enums;
using AssetBridge.Domain.Exceptions;
using AssetBridge.Infrastructure.Persistence;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace AssetBridge.UnitTests.Services;

public class AuditAndContinuityTests : IDisposable
{
    private readonly AssetBridgeDbContext _dbContext;
    private readonly WorkflowService _workflowSut;
    private readonly AuditService _auditSut;
    private readonly FollowUpService _followUpSut;
    private readonly Guid _ownerId = Guid.NewGuid();
    private readonly Guid _managerId = Guid.NewGuid();
    private readonly Guid _assetId = Guid.NewGuid();
    private readonly Guid _incidentId = Guid.NewGuid();

    public AuditAndContinuityTests()
    {
        var dbOptions = new DbContextOptionsBuilder<AssetBridgeDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _dbContext = new AssetBridgeDbContext(dbOptions);
        _workflowSut = new WorkflowService(_dbContext);
        _auditSut = new AuditService(_dbContext);
        _followUpSut = new FollowUpService(_dbContext);

        SeedTestData();
    }

    private void SeedTestData()
    {
        var owner = new User { Id = _ownerId, FullName = "Priyantha Jayawardena", Email = "owner@continuity.lk", Role = UserRole.Owner };
        var manager = new User { Id = _managerId, FullName = "Shalini Mendis", Email = "manager@continuity.lk", Role = UserRole.Manager };

        var asset = new Asset
        {
            Id = _assetId,
            OwnerId = _ownerId,
            Name = "Galle Fort Heritage Bungalow",
            PropertyType = PropertyType.SingleFamilyHouse,
            AddressLine1 = "44 Church Street",
            City = "Galle",
            District = "Galle"
        };

        var incident = new Incident
        {
            Id = _incidentId,
            AssetId = _assetId,
            ReportedByUserId = _ownerId,
            Title = "HVAC air conditioner cooling coil leak",
            Description = "Main living area AC is blowing warm air.",
            Category = IncidentCategory.HVAC,
            Priority = IncidentPriority.High,
            Status = IncidentStatus.Reported
        };

        _dbContext.Users.AddRange(owner, manager);
        _dbContext.Assets.Add(asset);
        _dbContext.Incidents.Add(incident);
        _dbContext.SaveChanges();
    }

    [Fact]
    public async Task AuditService_RecordEvent_PersistsAppendOnlyAuditEvent()
    {
        // Act
        var result = await _auditSut.RecordEventAsync(new CreateAuditEventDto
        {
            EventType = AuditEventType.SecurityEvent,
            Description = "Elevated role authorization check succeeded for manager approval.",
            MetadataJson = "{\"IpAddress\":\"192.168.1.100\",\"Action\":\"Approve\"}"
        }, _managerId);

        // Assert
        result.Should().NotBeNull();
        result.EventType.Should().Be(AuditEventType.SecurityEvent);
        result.UserName.Should().Be("Shalini Mendis");

        var events = await _auditSut.GetAuditEventsAsync(new AuditFilterParametersDto
        {
            EventType = AuditEventType.SecurityEvent
        }, _managerId, UserRole.Manager.ToString());

        events.Items.Should().HaveCount(1);
        events.Items.First().Description.Should().Contain("Elevated role authorization check");
    }

    [Fact]
    public async Task AgenticAi_RecordAgentRunAndToolExecution_PersistsCompleteObservabilityData()
    {
        // Arrange
        var wf = await _workflowSut.CreateWorkflowAsync(new CreateWorkflowRequestDto { IncidentId = _incidentId }, _managerId);

        // Act 1: Record Agent Run
        var agentRun = await _workflowSut.RecordAgentRunAsync(wf.Id, new CreateAgentRunDto
        {
            AgentName = "Quotation Auditor Agent",
            AgentType = AgentType.QuotationAuditor,
            InputSummary = "Evaluating 2 vendor quotes for AC compressor repair against market index."
        }, _managerId);

        agentRun.Should().NotBeNull();
        agentRun.Status.Should().Be(AgentRunStatus.Running);

        // Act 2: Record Tool Execution
        var toolExec = await _workflowSut.RecordToolExecutionAsync(wf.Id, agentRun.Id, new CreateToolExecutionDto
        {
            ToolName = "CompareQuotationsDeterministic",
            InputSummary = "Quote A: LKR 45,000, Quote B: LKR 42,000",
            OutputSummary = "Quote B is 6.7% cheaper and has higher SLA rating (4.8/5)",
            Status = ToolExecutionStatus.Success,
            ValidationResult = "Valid",
            DurationMs = 120
        }, _managerId);

        toolExec.Should().NotBeNull();
        toolExec.ToolName.Should().Be("CompareQuotationsDeterministic");
        toolExec.Status.Should().Be(ToolExecutionStatus.Success);

        // Act 3: Complete Agent Run
        var completedRun = await _workflowSut.CompleteAgentRunAsync(wf.Id, agentRun.Id, new CompleteAgentRunDto
        {
            Status = AgentRunStatus.Completed,
            OutputSummary = "Recommended Quote B with 94.2% confidence score."
        }, _managerId);

        completedRun.Status.Should().Be(AgentRunStatus.Completed);
        completedRun.OutputSummary.Should().Contain("Quote B");
        completedRun.DurationMs.Should().BeGreaterThanOrEqualTo(0);

        // Query agent runs
        var runs = await _workflowSut.GetAgentRunsAsync(wf.Id, _managerId, UserRole.Manager.ToString());
        runs.Should().HaveCount(1);
        runs.First().ToolExecutions.Should().HaveCount(1);
    }

    [Fact]
    public async Task FollowUpService_CreateTask_SchedulesPreventiveTaskLinkedToAssetAndWorkflow()
    {
        // Arrange
        var wf = await _workflowSut.CreateWorkflowAsync(new CreateWorkflowRequestDto { IncidentId = _incidentId }, _managerId);

        // Act: Create 30-day post-repair continuity check
        var dueDate = DateTime.UtcNow.AddDays(30);
        var followUp = await _followUpSut.CreateFollowUpTaskAsync(new CreateFollowUpTaskDto
        {
            WorkflowInstanceId = wf.Id,
            AssetId = _assetId,
            Title = "30-Day AC Refrigerant Pressure & Compressor Health Check",
            Description = "Verify refrigerant levels and check if inverter power draw is normal.",
            DueDateUtc = dueDate,
            Priority = FollowUpPriority.High,
            AssignedToUserId = _managerId
        }, _managerId, UserRole.Manager.ToString());

        // Assert
        followUp.Should().NotBeNull();
        followUp.Title.Should().Contain("30-Day AC Refrigerant Pressure");
        followUp.AssetName.Should().Be("Galle Fort Heritage Bungalow");
        followUp.Status.Should().Be(FollowUpStatus.Pending);
        followUp.IsOverdue.Should().BeFalse();

        // Update status to Completed
        var updated = await _followUpSut.UpdateFollowUpStatusAsync(followUp.Id, new UpdateFollowUpStatusDto
        {
            Status = FollowUpStatus.Completed,
            ResolutionNotes = "Technician checked refrigerant pressure: 120 PSI (optimal). Compressor running quietly."
        }, _managerId, UserRole.Manager.ToString());

        updated.Status.Should().Be(FollowUpStatus.Completed);
        updated.CompletedAtUtc.Should().NotBeNull();
        updated.Description.Should().Contain("Technician checked refrigerant pressure");
    }

    [Fact]
    public async Task DashboardMetrics_CalculatesAggregatedMetricsCorrectly()
    {
        // Arrange: Create a workflow and follow-up
        var wf = await _workflowSut.CreateWorkflowAsync(new CreateWorkflowRequestDto { IncidentId = _incidentId }, _managerId);
        await _workflowSut.TransitionWorkflowAsync(wf.Id, new TransitionWorkflowRequestDto { TargetState = WorkflowState.Planning }, _managerId, UserRole.Manager.ToString());
        await _workflowSut.TransitionWorkflowAsync(wf.Id, new TransitionWorkflowRequestDto { TargetState = WorkflowState.ProviderSelection }, _managerId, UserRole.Manager.ToString());
        await _workflowSut.TransitionWorkflowAsync(wf.Id, new TransitionWorkflowRequestDto { TargetState = WorkflowState.QuotationReview }, _managerId, UserRole.Manager.ToString());
        await _workflowSut.CreateApprovalRequestAsync(wf.Id, new CreateApprovalRequestDto(), _managerId, UserRole.Manager.ToString());

        // Create an overdue follow up task
        await _followUpSut.CreateFollowUpTaskAsync(new CreateFollowUpTaskDto
        {
            AssetId = _assetId,
            Title = "Overdue Roof Inspection",
            Description = "Overdue checklist",
            DueDateUtc = DateTime.UtcNow.AddDays(-5),
            Priority = FollowUpPriority.Critical
        }, _managerId, UserRole.Manager.ToString());

        // Act
        var metrics = await _workflowSut.GetDashboardMetricsAsync(_managerId, UserRole.Manager.ToString());

        // Assert
        metrics.Should().NotBeNull();
        metrics.ActiveWorkflowsCount.Should().Be(1);
        metrics.PendingApprovalsCount.Should().Be(1);
        metrics.OverdueFollowUpsCount.Should().Be(1);
        metrics.RecentWorkflows.Should().HaveCount(1);
    }

    [Fact]
    public async Task FollowUpService_Representative_CanQueryFollowUpCreatedWithoutAssignedToUserId()
    {
        // Arrange: Create a follow-up task without an assigned user (e.g. from continuity UI)
        var repId = Guid.NewGuid();
        var repUser = new User { Id = repId, FullName = "Kasun Perera", Email = "rep@continuity.lk", Role = UserRole.Representative };
        _dbContext.Users.Add(repUser);
        await _dbContext.SaveChangesAsync();

        var created = await _followUpSut.CreateFollowUpTaskAsync(new CreateFollowUpTaskDto
        {
            AssetId = _assetId,
            Title = "Post-repair quarterly waterproofing verification",
            Description = "Verify no seepage or water staining after heavy monsoon rains.",
            DueDateUtc = DateTime.UtcNow.AddDays(14),
            Priority = FollowUpPriority.High,
            AssignedToUserId = null
        }, repId, UserRole.Representative.ToString());

        // Act: Query follow-ups as Representative
        var result = await _followUpSut.GetFollowUpTasksAsync(new FollowUpFilterParametersDto
        {
            PageSize = 50
        }, repId, UserRole.Representative.ToString());

        // Assert
        result.Should().NotBeNull();
        result.TotalCount.Should().BeGreaterThanOrEqualTo(1);
        result.Items.Should().Contain(t => t.Id == created.Id);
        var retrieved = result.Items.First(t => t.Id == created.Id);
        retrieved.Title.Should().Be("Post-repair quarterly waterproofing verification");
        retrieved.AssignedToUserId.Should().BeNull();
    }

    [Fact]
    public async Task FollowUpService_Owner_StrictlyRestrictedToOwnedAssetFollowUps()
    {
        // Arrange: Create a second owner and asset with its own follow-up
        var otherOwnerId = Guid.NewGuid();
        var otherAssetId = Guid.NewGuid();
        var otherOwner = new User { Id = otherOwnerId, FullName = "Nimal Silva", Email = "nimal@continuity.lk", Role = UserRole.Owner };
        var otherAsset = new Asset
        {
            Id = otherAssetId,
            OwnerId = otherOwnerId,
            Name = "Kandy Hillside Villa",
            PropertyType = PropertyType.SingleFamilyHouse,
            AddressLine1 = "12 Lake Road",
            City = "Kandy",
            District = "Kandy"
        };
        _dbContext.Users.Add(otherOwner);
        _dbContext.Assets.Add(otherAsset);
        await _dbContext.SaveChangesAsync();

        var owner1Task = await _followUpSut.CreateFollowUpTaskAsync(new CreateFollowUpTaskDto
        {
            AssetId = _assetId,
            Title = "Owner 1 Heritage Timber Polish Check",
            Description = "Check varnish condition on main doors.",
            DueDateUtc = DateTime.UtcNow.AddDays(7),
            Priority = FollowUpPriority.Medium
        }, _managerId, UserRole.Manager.ToString());

        var owner2Task = await _followUpSut.CreateFollowUpTaskAsync(new CreateFollowUpTaskDto
        {
            AssetId = otherAssetId,
            Title = "Owner 2 Retaining Wall Drainage Inspection",
            Description = "Ensure runoff weep holes are clear.",
            DueDateUtc = DateTime.UtcNow.AddDays(10),
            Priority = FollowUpPriority.High
        }, _managerId, UserRole.Manager.ToString());

        // Act: Query as Owner 1
        var owner1Result = await _followUpSut.GetFollowUpTasksAsync(new FollowUpFilterParametersDto(), _ownerId, UserRole.Owner.ToString());

        // Assert: Owner 1 sees only Owner 1's tasks
        owner1Result.Items.Should().Contain(t => t.Id == owner1Task.Id);
        owner1Result.Items.Should().NotContain(t => t.Id == owner2Task.Id);

        // Act: Query as Owner 2
        var owner2Result = await _followUpSut.GetFollowUpTasksAsync(new FollowUpFilterParametersDto(), otherOwnerId, UserRole.Owner.ToString());

        // Assert: Owner 2 sees only Owner 2's tasks
        owner2Result.Items.Should().Contain(t => t.Id == owner2Task.Id);
        owner2Result.Items.Should().NotContain(t => t.Id == owner1Task.Id);
    }

    [Fact]
    public async Task FollowUpService_ManagerAndAdmin_CanQueryAllContinuityTasksAcrossAssets()
    {
        // Arrange: Create follow-up tasks across multiple assets
        var taskA = await _followUpSut.CreateFollowUpTaskAsync(new CreateFollowUpTaskDto
        {
            AssetId = _assetId,
            Title = "Task Across Asset A",
            Description = "Checkup A",
            DueDateUtc = DateTime.UtcNow.AddDays(5)
        }, _managerId, UserRole.Manager.ToString());

        // Act: Query as Manager
        var managerResult = await _followUpSut.GetFollowUpTasksAsync(new FollowUpFilterParametersDto(), _managerId, UserRole.Manager.ToString());

        // Act: Query as Admin
        var adminId = Guid.NewGuid();
        var adminResult = await _followUpSut.GetFollowUpTasksAsync(new FollowUpFilterParametersDto(), adminId, UserRole.Admin.ToString());

        // Assert: Both can see the task
        managerResult.Items.Should().Contain(t => t.Id == taskA.Id);
        adminResult.Items.Should().Contain(t => t.Id == taskA.Id);
    }

    public void Dispose()
    {
        _dbContext.Dispose();
    }
}
