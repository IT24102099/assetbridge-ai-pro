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

public class WorkflowStateMachineTests : IDisposable
{
    private readonly AssetBridgeDbContext _dbContext;
    private readonly WorkflowService _sut;
    private readonly Guid _ownerId = Guid.NewGuid();
    private readonly Guid _managerId = Guid.NewGuid();
    private readonly Guid _assetId = Guid.NewGuid();
    private readonly Guid _incidentId = Guid.NewGuid();

    public WorkflowStateMachineTests()
    {
        var dbOptions = new DbContextOptionsBuilder<AssetBridgeDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _dbContext = new AssetBridgeDbContext(dbOptions);
        _sut = new WorkflowService(_dbContext);

        SeedTestData();
    }

    private void SeedTestData()
    {
        var owner = new User
        {
            Id = _ownerId,
            FullName = "Amara Silva",
            Email = "amara@assetbridge.lk",
            Role = UserRole.Owner
        };

        var manager = new User
        {
            Id = _managerId,
            FullName = "Kavinda Perera",
            Email = "kavinda@assetbridge.lk",
            Role = UserRole.Manager
        };

        var asset = new Asset
        {
            Id = _assetId,
            OwnerId = _ownerId,
            Name = "Colombo Seaview Apartment",
            PropertyType = PropertyType.Apartment,
            AddressLine1 = "10 Galle Road",
            City = "Colombo",
            District = "Colombo"
        };

        var incident = new Incident
        {
            Id = _incidentId,
            AssetId = _assetId,
            ReportedByUserId = _ownerId,
            Title = "Master bathroom water leak",
            Description = "Ceiling pipe is leaking water rapidly.",
            Category = IncidentCategory.Plumbing,
            Priority = IncidentPriority.High,
            Status = IncidentStatus.Reported
        };

        _dbContext.Users.AddRange(owner, manager);
        _dbContext.Assets.Add(asset);
        _dbContext.Incidents.Add(incident);
        _dbContext.SaveChanges();
    }

    [Fact]
    public async Task CreateWorkflow_ValidIncident_CreatesInCreatedStateWithInitialStepAndAudit()
    {
        // Act
        var result = await _sut.CreateWorkflowAsync(new CreateWorkflowRequestDto
        {
            IncidentId = _incidentId,
            InitialNotes = "Auto-initiated by Incident Planning Agent"
        }, _managerId);

        // Assert
        result.Should().NotBeNull();
        result.IncidentId.Should().Be(_incidentId);
        result.CurrentState.Should().Be(WorkflowState.Created);
        result.StepsCount.Should().Be(1);

        var dbWorkflow = await _dbContext.WorkflowInstances
            .Include(w => w.Steps)
            .Include(w => w.AuditEvents)
            .FirstOrDefaultAsync(w => w.Id == result.Id);

        dbWorkflow.Should().NotBeNull();
        dbWorkflow!.Steps.Should().HaveCount(1);
        dbWorkflow.Steps.First().StepState.Should().Be(WorkflowState.Created);
        dbWorkflow.AuditEvents.Should().HaveCount(1);
        dbWorkflow.AuditEvents.First().EventType.Should().Be(AuditEventType.WorkflowCreated);
    }

    [Fact]
    public async Task CreateWorkflow_DuplicateActiveWorkflow_ThrowsValidationException()
    {
        // Arrange
        await _sut.CreateWorkflowAsync(new CreateWorkflowRequestDto { IncidentId = _incidentId }, _managerId);

        // Act
        var act = async () => await _sut.CreateWorkflowAsync(new CreateWorkflowRequestDto { IncidentId = _incidentId }, _managerId);

        // Assert
        await act.Should().ThrowAsync<ValidationException>()
            .WithMessage("*active workflow is already underway*");
    }

    [Fact]
    public async Task TransitionWorkflow_ValidSequentialProgression_SucceedsAndTracksSteps()
    {
        // Arrange: Create
        var workflow = await _sut.CreateWorkflowAsync(new CreateWorkflowRequestDto { IncidentId = _incidentId }, _managerId);

        // 1. Created -> Planning
        var step1 = await _sut.TransitionWorkflowAsync(workflow.Id, new TransitionWorkflowRequestDto
        {
            TargetState = WorkflowState.Planning,
            Reason = "Incident Planning Agent initiated root-cause analysis",
            Actor = "Agent:IncidentPlanner"
        }, _managerId, UserRole.Manager.ToString());
        step1.CurrentState.Should().Be(WorkflowState.Planning);

        // 2. Planning -> ProviderSelection
        var step2 = await _sut.TransitionWorkflowAsync(workflow.Id, new TransitionWorkflowRequestDto
        {
            TargetState = WorkflowState.ProviderSelection,
            Reason = "Provider Matching Agent querying nearby verified plumbers",
            Actor = "Agent:ProviderMatcher"
        }, _managerId, UserRole.Manager.ToString());
        step2.CurrentState.Should().Be(WorkflowState.ProviderSelection);

        // 3. ProviderSelection -> InspectionPending
        var step3 = await _sut.TransitionWorkflowAsync(workflow.Id, new TransitionWorkflowRequestDto
        {
            TargetState = WorkflowState.InspectionPending,
            Reason = "Inspection scheduled with local technician",
            Actor = "User:Manager"
        }, _managerId, UserRole.Manager.ToString());
        step3.CurrentState.Should().Be(WorkflowState.InspectionPending);

        // 4. InspectionPending -> QuotationReview
        var step4 = await _sut.TransitionWorkflowAsync(workflow.Id, new TransitionWorkflowRequestDto
        {
            TargetState = WorkflowState.QuotationReview,
            Reason = "Technician submitted itemized quotation",
            Actor = "User:Provider"
        }, _managerId, UserRole.Manager.ToString());
        step4.CurrentState.Should().Be(WorkflowState.QuotationReview);

        // 5. QuotationReview -> AiValidation
        var step5 = await _sut.TransitionWorkflowAsync(workflow.Id, new TransitionWorkflowRequestDto
        {
            TargetState = WorkflowState.AiValidation,
            Reason = "Quotation Auditor Agent evaluating market rates",
            Actor = "Agent:QuotationAuditor"
        }, _managerId, UserRole.Manager.ToString());
        step5.CurrentState.Should().Be(WorkflowState.AiValidation);

        // Verify full timeline in database
        var timeline = await _sut.GetWorkflowTimelineAsync(workflow.Id, _managerId, UserRole.Manager.ToString());
        timeline.Should().NotBeNull();
        timeline!.Steps.Should().HaveCount(6); // Created + 5 transitions
        timeline.AuditEvents.Should().HaveCount(6); // 1 create + 5 state change events
    }

    [Fact]
    public async Task TransitionWorkflow_IllegalArbitraryTransition_ThrowsValidationException()
    {
        // Arrange
        var workflow = await _sut.CreateWorkflowAsync(new CreateWorkflowRequestDto { IncidentId = _incidentId }, _managerId);

        // Act: Attempt to jump from Created directly to Approved (Illegal)
        var act = async () => await _sut.TransitionWorkflowAsync(workflow.Id, new TransitionWorkflowRequestDto
        {
            TargetState = WorkflowState.Approved,
            Reason = "Bypassing intermediate validation steps"
        }, _managerId, UserRole.Manager.ToString());

        // Assert
        await act.Should().ThrowAsync<ValidationException>()
            .WithMessage("*Invalid state transition from 'Created' to 'Approved'*");
    }

    [Fact]
    public async Task FailWorkflow_FromAnyActiveState_SetsStateToFailedAndRecordsAudit()
    {
        // Arrange
        var workflow = await _sut.CreateWorkflowAsync(new CreateWorkflowRequestDto { IncidentId = _incidentId }, _managerId);
        await _sut.TransitionWorkflowAsync(workflow.Id, new TransitionWorkflowRequestDto
        {
            TargetState = WorkflowState.Planning
        }, _managerId, UserRole.Manager.ToString());

        // Act
        var result = await _sut.FailWorkflowAsync(workflow.Id, new FailWorkflowRequestDto
        {
            FailureReason = "Provider unreachable and property inaccessible",
            Details = "Technician arrived but security gate was locked."
        }, _managerId, UserRole.Manager.ToString());

        // Assert
        result.CurrentState.Should().Be(WorkflowState.Failed);
        result.FailureReason.Should().Be("Provider unreachable and property inaccessible");

        var timeline = await _sut.GetWorkflowTimelineAsync(workflow.Id, _managerId, UserRole.Manager.ToString());
        timeline!.Steps.Last().Status.Should().Be(WorkflowStepStatus.Failed);
        timeline.AuditEvents.Should().Contain(a => a.EventType == AuditEventType.WorkflowFailed);
    }

    [Fact]
    public async Task FailWorkflow_CanRecoverBackToPlanningForRetry()
    {
        // Arrange
        var workflow = await _sut.CreateWorkflowAsync(new CreateWorkflowRequestDto { IncidentId = _incidentId }, _managerId);
        await _sut.FailWorkflowAsync(workflow.Id, new FailWorkflowRequestDto
        {
            FailureReason = "Network timeout"
        }, _managerId, UserRole.Manager.ToString());

        // Act: Recover from Failed -> Planning
        var recovered = await _sut.TransitionWorkflowAsync(workflow.Id, new TransitionWorkflowRequestDto
        {
            TargetState = WorkflowState.Planning,
            Reason = "Retrying workflow with alternative representative"
        }, _managerId, UserRole.Manager.ToString());

        // Assert
        recovered.CurrentState.Should().Be(WorkflowState.Planning);
    }

    public void Dispose()
    {
        _dbContext.Dispose();
    }
}
