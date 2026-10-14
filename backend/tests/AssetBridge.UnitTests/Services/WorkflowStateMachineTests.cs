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
        // TC-WF-001: Valid Workflow Initialization
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
        dbWorkflow.Steps.First().Status.Should().Be(WorkflowStepStatus.InProgress);
        dbWorkflow.AuditEvents.Should().HaveCount(1);
        dbWorkflow.AuditEvents.First().EventType.Should().Be(AuditEventType.WorkflowCreated);
        dbWorkflow.CorrelationId.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task CreateWorkflow_DuplicateActiveWorkflow_ThrowsValidationException()
    {
        // TC-WF-002: Duplicate Workflow Prevention
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
        // TC-WF-003: Sequential Multi-Agent Progression (Created -> Planning -> ProviderSelection -> InspectionPending -> QuotationReview -> AiValidation)
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
        // TC-WF-004: Illegal Jump Rejection (Created -> Approved Bypass Guard)
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
    public async Task TransitionWorkflow_ApprovedToExecution_CalculatesStepDuration()
    {
        // TC-WF-005: Operational Transition (Approved -> Execution)
        // Arrange
        var workflow = await _sut.CreateWorkflowAsync(new CreateWorkflowRequestDto { IncidentId = _incidentId }, _managerId);
        await _sut.TransitionWorkflowAsync(workflow.Id, new TransitionWorkflowRequestDto { TargetState = WorkflowState.Planning }, _managerId, UserRole.Manager.ToString());
        await _sut.TransitionWorkflowAsync(workflow.Id, new TransitionWorkflowRequestDto { TargetState = WorkflowState.ProviderSelection }, _managerId, UserRole.Manager.ToString());
        await _sut.TransitionWorkflowAsync(workflow.Id, new TransitionWorkflowRequestDto { TargetState = WorkflowState.QuotationReview }, _managerId, UserRole.Manager.ToString());
        await _sut.CreateApprovalRequestAsync(workflow.Id, new CreateApprovalRequestDto(), _managerId, UserRole.Manager.ToString());
        await _sut.ApproveWorkflowAsync(workflow.Id, new ApprovalDecisionRequestDto { DecisionReason = "Budget approved" }, _managerId, UserRole.Manager.ToString());

        // Act: Approved -> Execution
        var executionResult = await _sut.TransitionWorkflowAsync(workflow.Id, new TransitionWorkflowRequestDto
        {
            TargetState = WorkflowState.Execution,
            Reason = "Contractor commenced plumbing pipe repairs",
            Actor = "User:Provider"
        }, _managerId, UserRole.Manager.ToString());

        // Assert
        executionResult.CurrentState.Should().Be(WorkflowState.Execution);
        executionResult.StartedAtUtc.Should().NotBeNull();

        var timeline = await _sut.GetWorkflowTimelineAsync(workflow.Id, _managerId, UserRole.Manager.ToString());
        var approvedStep = timeline!.Steps.FirstOrDefault(s => s.StepState == WorkflowState.Approved);
        approvedStep.Should().NotBeNull();
        approvedStep!.Status.Should().Be(WorkflowStepStatus.Completed);
    }

    [Fact]
    public async Task TransitionWorkflow_FullLifecycle_ExecutionToCompletionReviewToCompletedToFollowUp()
    {
        // TC-WF-006: Terminal Lifecycle Transitions (Execution -> CompletionReview -> Completed -> FollowUp)
        // Arrange: Fast-forward to Execution
        var workflow = await _sut.CreateWorkflowAsync(new CreateWorkflowRequestDto { IncidentId = _incidentId }, _managerId);
        await _sut.TransitionWorkflowAsync(workflow.Id, new TransitionWorkflowRequestDto { TargetState = WorkflowState.Planning }, _managerId, UserRole.Manager.ToString());
        await _sut.TransitionWorkflowAsync(workflow.Id, new TransitionWorkflowRequestDto { TargetState = WorkflowState.ProviderSelection }, _managerId, UserRole.Manager.ToString());
        await _sut.TransitionWorkflowAsync(workflow.Id, new TransitionWorkflowRequestDto { TargetState = WorkflowState.QuotationReview }, _managerId, UserRole.Manager.ToString());
        await _sut.CreateApprovalRequestAsync(workflow.Id, new CreateApprovalRequestDto(), _managerId, UserRole.Manager.ToString());
        await _sut.ApproveWorkflowAsync(workflow.Id, new ApprovalDecisionRequestDto { DecisionReason = "Approved" }, _managerId, UserRole.Manager.ToString());
        await _sut.TransitionWorkflowAsync(workflow.Id, new TransitionWorkflowRequestDto { TargetState = WorkflowState.Execution }, _managerId, UserRole.Manager.ToString());

        // Act 1: Execution -> CompletionReview
        var review = await _sut.TransitionWorkflowAsync(workflow.Id, new TransitionWorkflowRequestDto
        {
            TargetState = WorkflowState.CompletionReview,
            Reason = "Work completed, on-site photos uploaded for verification"
        }, _managerId, UserRole.Manager.ToString());
        review.CurrentState.Should().Be(WorkflowState.CompletionReview);

        // Act 2: CompletionReview -> Completed
        var completed = await _sut.TransitionWorkflowAsync(workflow.Id, new TransitionWorkflowRequestDto
        {
            TargetState = WorkflowState.Completed,
            Reason = "Manager confirmed satisfactory completion and invoice payment"
        }, _managerId, UserRole.Manager.ToString());
        completed.CurrentState.Should().Be(WorkflowState.Completed);
        completed.CompletedAtUtc.Should().NotBeNull();

        // Act 3: Completed -> FollowUp
        var followUp = await _sut.TransitionWorkflowAsync(workflow.Id, new TransitionWorkflowRequestDto
        {
            TargetState = WorkflowState.FollowUp,
            Reason = "Scheduled 30-day post-repair inspection check"
        }, _managerId, UserRole.Manager.ToString());
        followUp.CurrentState.Should().Be(WorkflowState.FollowUp);
    }

    [Fact]
    public async Task TransitionWorkflow_DirectPath_QuotationReviewToAwaitingApproval()
    {
        // TC-WF-007: Direct Transition Path (QuotationReview -> AwaitingApproval)
        // Arrange
        var workflow = await _sut.CreateWorkflowAsync(new CreateWorkflowRequestDto { IncidentId = _incidentId }, _managerId);
        await _sut.TransitionWorkflowAsync(workflow.Id, new TransitionWorkflowRequestDto { TargetState = WorkflowState.Planning }, _managerId, UserRole.Manager.ToString());
        await _sut.TransitionWorkflowAsync(workflow.Id, new TransitionWorkflowRequestDto { TargetState = WorkflowState.ProviderSelection }, _managerId, UserRole.Manager.ToString());
        await _sut.TransitionWorkflowAsync(workflow.Id, new TransitionWorkflowRequestDto { TargetState = WorkflowState.QuotationReview }, _managerId, UserRole.Manager.ToString());

        // Act: Direct transition to AwaitingApproval
        var awaiting = await _sut.TransitionWorkflowAsync(workflow.Id, new TransitionWorkflowRequestDto
        {
            TargetState = WorkflowState.AwaitingApproval,
            Reason = "Quotation ready for manager sign-off"
        }, _managerId, UserRole.Manager.ToString());

        // Assert
        awaiting.CurrentState.Should().Be(WorkflowState.AwaitingApproval);
    }

    [Fact]
    public async Task TransitionWorkflow_ProviderSelectionToQuotationReview_SkipsInspectionWhenNotRequired()
    {
        // TC-WF-008: Valid Branch (ProviderSelection -> QuotationReview without Inspection)
        // Arrange
        var workflow = await _sut.CreateWorkflowAsync(new CreateWorkflowRequestDto { IncidentId = _incidentId }, _managerId);
        await _sut.TransitionWorkflowAsync(workflow.Id, new TransitionWorkflowRequestDto { TargetState = WorkflowState.Planning }, _managerId, UserRole.Manager.ToString());
        await _sut.TransitionWorkflowAsync(workflow.Id, new TransitionWorkflowRequestDto { TargetState = WorkflowState.ProviderSelection }, _managerId, UserRole.Manager.ToString());

        // Act: Skip InspectionPending and go directly to QuotationReview
        var quoteReview = await _sut.TransitionWorkflowAsync(workflow.Id, new TransitionWorkflowRequestDto
        {
            TargetState = WorkflowState.QuotationReview,
            Reason = "Direct estimate provided from initial photos; no physical inspection needed."
        }, _managerId, UserRole.Manager.ToString());

        // Assert
        quoteReview.CurrentState.Should().Be(WorkflowState.QuotationReview);
    }

    [Fact]
    public async Task TransitionWorkflow_FromTerminalFollowUp_ThrowsValidationException()
    {
        // TC-WF-009: Terminal State Guard (FollowUp has empty transition set)
        // Arrange: Advance to FollowUp
        var workflow = await _sut.CreateWorkflowAsync(new CreateWorkflowRequestDto { IncidentId = _incidentId }, _managerId);
        await _sut.TransitionWorkflowAsync(workflow.Id, new TransitionWorkflowRequestDto { TargetState = WorkflowState.Planning }, _managerId, UserRole.Manager.ToString());
        await _sut.TransitionWorkflowAsync(workflow.Id, new TransitionWorkflowRequestDto { TargetState = WorkflowState.ProviderSelection }, _managerId, UserRole.Manager.ToString());
        await _sut.TransitionWorkflowAsync(workflow.Id, new TransitionWorkflowRequestDto { TargetState = WorkflowState.QuotationReview }, _managerId, UserRole.Manager.ToString());
        await _sut.CreateApprovalRequestAsync(workflow.Id, new CreateApprovalRequestDto(), _managerId, UserRole.Manager.ToString());
        await _sut.ApproveWorkflowAsync(workflow.Id, new ApprovalDecisionRequestDto { DecisionReason = "Approved" }, _managerId, UserRole.Manager.ToString());
        await _sut.TransitionWorkflowAsync(workflow.Id, new TransitionWorkflowRequestDto { TargetState = WorkflowState.Execution }, _managerId, UserRole.Manager.ToString());
        await _sut.TransitionWorkflowAsync(workflow.Id, new TransitionWorkflowRequestDto { TargetState = WorkflowState.CompletionReview }, _managerId, UserRole.Manager.ToString());
        await _sut.TransitionWorkflowAsync(workflow.Id, new TransitionWorkflowRequestDto { TargetState = WorkflowState.Completed }, _managerId, UserRole.Manager.ToString());
        await _sut.TransitionWorkflowAsync(workflow.Id, new TransitionWorkflowRequestDto { TargetState = WorkflowState.FollowUp }, _managerId, UserRole.Manager.ToString());

        // Act: Attempt transition from FollowUp -> Planning
        var act = async () => await _sut.TransitionWorkflowAsync(workflow.Id, new TransitionWorkflowRequestDto
        {
            TargetState = WorkflowState.Planning
        }, _managerId, UserRole.Manager.ToString());

        // Assert
        await act.Should().ThrowAsync<ValidationException>()
            .WithMessage("*Invalid state transition from 'FollowUp'*");
    }

    [Fact]
    public async Task TransitionWorkflow_NonExistentWorkflow_ThrowsEntityNotFoundException()
    {
        // TC-WF-010: Missing Entity Exception Handling
        var nonExistentId = Guid.NewGuid();

        var act = async () => await _sut.TransitionWorkflowAsync(nonExistentId, new TransitionWorkflowRequestDto
        {
            TargetState = WorkflowState.Planning
        }, _managerId, UserRole.Manager.ToString());

        await act.Should().ThrowAsync<EntityNotFoundException>();
    }

    [Fact]
    public async Task FailWorkflow_FromAnyActiveState_SetsStateToFailedAndRecordsAudit()
    {
        // TC-WF-011: Safe Failure Handling
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
        // TC-WF-012: Failure Recovery Loop (Failed -> Planning)
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

    [Fact]
    public async Task GetWorkflowTimeline_ReturnsChronologicalStepsAndAuditEvents()
    {
        // TC-WF-013: Timeline Assembly Verification
        // Arrange
        var workflow = await _sut.CreateWorkflowAsync(new CreateWorkflowRequestDto { IncidentId = _incidentId }, _managerId);
        await _sut.TransitionWorkflowAsync(workflow.Id, new TransitionWorkflowRequestDto { TargetState = WorkflowState.Planning }, _managerId, UserRole.Manager.ToString());

        // Act
        var timeline = await _sut.GetWorkflowTimelineAsync(workflow.Id, _managerId, UserRole.Manager.ToString());

        // Assert
        timeline.Should().NotBeNull();
        timeline!.WorkflowInstanceId.Should().Be(workflow.Id);
        timeline.Steps.Should().HaveCount(2);
        timeline.AuditEvents.Should().HaveCount(2);
        timeline.Steps.First().StepStateName.Should().Be("Created");
        timeline.Steps.Last().StepStateName.Should().Be("Planning");
    }

    [Fact]
    public async Task GetWorkflows_ScopedToOwner_ReturnsOnlyOwnedAssetsWorkflows()
    {
        // TC-WF-014: Scoped Query Security (Owner isolation)
        // Arrange
        await _sut.CreateWorkflowAsync(new CreateWorkflowRequestDto { IncidentId = _incidentId }, _managerId);

        var otherOwnerId = Guid.NewGuid();
        var otherAsset = new Asset { Id = Guid.NewGuid(), OwnerId = otherOwnerId, Name = "Other Asset", PropertyType = PropertyType.Villa, AddressLine1 = "Road", City = "Kandy", District = "Kandy" };
        var otherIncident = new Incident { Id = Guid.NewGuid(), AssetId = otherAsset.Id, ReportedByUserId = otherOwnerId, Title = "Other leak", Category = IncidentCategory.Plumbing, Priority = IncidentPriority.Low, Status = IncidentStatus.Reported };
        _dbContext.Assets.Add(otherAsset);
        _dbContext.Incidents.Add(otherIncident);
        _dbContext.SaveChanges();

        await _sut.CreateWorkflowAsync(new CreateWorkflowRequestDto { IncidentId = otherIncident.Id }, _managerId);

        // Act: Query as Amara Silva (_ownerId)
        var ownerList = await _sut.GetWorkflowsAsync(new WorkflowFilterParametersDto(), _ownerId, UserRole.Owner.ToString());

        // Assert: Amara should only see her own property workflow (count = 1)
        ownerList.TotalCount.Should().Be(1);
        ownerList.Items.Should().ContainSingle(w => w.AssetId == _assetId);
    }

    public void Dispose()
    {
        _dbContext.Dispose();
    }
}
