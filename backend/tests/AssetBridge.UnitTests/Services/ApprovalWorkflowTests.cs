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

public class ApprovalWorkflowTests : IDisposable
{
    private readonly AssetBridgeDbContext _dbContext;
    private readonly WorkflowService _sut;
    private readonly Guid _ownerId = Guid.NewGuid();
    private readonly Guid _managerId = Guid.NewGuid();
    private readonly Guid _adminId = Guid.NewGuid();
    private readonly Guid _providerId = Guid.NewGuid();
    private readonly Guid _incidentId = Guid.NewGuid();
    private Guid _workflowId;

    public ApprovalWorkflowTests()
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
        var owner = new User { Id = _ownerId, FullName = "Sunil Perera", Email = "owner@test.lk", Role = UserRole.Owner };
        var manager = new User { Id = _managerId, FullName = "Niroshan Dias", Email = "manager@test.lk", Role = UserRole.Manager };
        var admin = new User { Id = _adminId, FullName = "Admin User", Email = "admin@test.lk", Role = UserRole.Admin };
        var provider = new User { Id = _providerId, FullName = "QuickFix Contractors", Email = "provider@test.lk", Role = UserRole.ServiceProvider };

        var asset = new Asset
        {
            Id = Guid.NewGuid(),
            OwnerId = _ownerId,
            Name = "Negombo Beach Villa",
            PropertyType = PropertyType.Villa,
            AddressLine1 = "12 Beach Road",
            City = "Negombo",
            District = "Gampaha"
        };

        var incident = new Incident
        {
            Id = _incidentId,
            AssetId = asset.Id,
            ReportedByUserId = _ownerId,
            Title = "Roof tiles cracked after heavy storm",
            Description = "Rainwater seeping into top floor bedroom.",
            Category = IncidentCategory.Roofing,
            Priority = IncidentPriority.Emergency,
            Status = IncidentStatus.Validating,
            EstimatedBudget = 150000m
        };

        _dbContext.Users.AddRange(owner, manager, admin, provider);
        _dbContext.Assets.Add(asset);
        _dbContext.Incidents.Add(incident);
        _dbContext.SaveChanges();

        // Create workflow and advance to QuotationReview -> AiValidation
        var wf = _sut.CreateWorkflowAsync(new CreateWorkflowRequestDto { IncidentId = _incidentId }, _managerId).GetAwaiter().GetResult();
        _workflowId = wf.Id;

        _sut.TransitionWorkflowAsync(_workflowId, new TransitionWorkflowRequestDto { TargetState = WorkflowState.Planning }, _managerId, UserRole.Manager.ToString()).GetAwaiter().GetResult();
        _sut.TransitionWorkflowAsync(_workflowId, new TransitionWorkflowRequestDto { TargetState = WorkflowState.ProviderSelection }, _managerId, UserRole.Manager.ToString()).GetAwaiter().GetResult();
        _sut.TransitionWorkflowAsync(_workflowId, new TransitionWorkflowRequestDto { TargetState = WorkflowState.QuotationReview }, _managerId, UserRole.Manager.ToString()).GetAwaiter().GetResult();
        _sut.TransitionWorkflowAsync(_workflowId, new TransitionWorkflowRequestDto { TargetState = WorkflowState.AiValidation }, _managerId, UserRole.Manager.ToString()).GetAwaiter().GetResult();
    }

    [Fact]
    public async Task CreateApprovalRequest_ValidWorkflowState_TransitionsWorkflowToAwaitingApproval()
    {
        // TC-AP-001: Valid Approval Request Initialization
        // Act
        var result = await _sut.CreateApprovalRequestAsync(_workflowId, new CreateApprovalRequestDto
        {
            AssignedApproverUserId = _managerId,
            InitialNotes = "AI verified quotation within estimated budget of LKR 150,000."
        }, _managerId, UserRole.Manager.ToString());

        // Assert
        result.Should().NotBeNull();
        result.Status.Should().Be(ApprovalStatus.Pending);

        var wf = await _dbContext.WorkflowInstances.FindAsync(_workflowId);
        wf!.CurrentState.Should().Be(WorkflowState.AwaitingApproval);

        var dbApproval = await _dbContext.ApprovalRequests.FirstOrDefaultAsync(a => a.WorkflowInstanceId == _workflowId);
        dbApproval.Should().NotBeNull();
        dbApproval!.Status.Should().Be(ApprovalStatus.Pending);
    }

    [Fact]
    public async Task CreateApprovalRequest_DuplicatePendingRequest_ThrowsValidationException()
    {
        // TC-AP-002: Duplicate Pending Approval Prevention
        // Arrange
        await _sut.CreateApprovalRequestAsync(_workflowId, new CreateApprovalRequestDto(), _managerId, UserRole.Manager.ToString());

        // Act: Attempt second concurrent/duplicate approval request
        var act = async () => await _sut.CreateApprovalRequestAsync(_workflowId, new CreateApprovalRequestDto(), _managerId, UserRole.Manager.ToString());

        // Assert
        await act.Should().ThrowAsync<ValidationException>()
            .WithMessage("*pending approval request already exists*");
    }

    [Fact]
    public async Task CreateApprovalRequest_InvalidState_ThrowsValidationException()
    {
        // TC-AP-003: Approval Request State Machine Guard (Cannot request from Created/Planning directly)
        // Arrange: Create new workflow in Created state
        var newIncidentId = Guid.NewGuid();
        var newIncident = new Incident { Id = newIncidentId, AssetId = _dbContext.Assets.First().Id, ReportedByUserId = _ownerId, Title = "Roof Leak 2", Category = IncidentCategory.Roofing, Priority = IncidentPriority.Medium, Status = IncidentStatus.Reported };
        _dbContext.Incidents.Add(newIncident);
        await _dbContext.SaveChangesAsync();

        var freshWf = await _sut.CreateWorkflowAsync(new CreateWorkflowRequestDto { IncidentId = newIncidentId }, _managerId);

        // Act: Request approval while still in Created state
        var act = async () => await _sut.CreateApprovalRequestAsync(freshWf.Id, new CreateApprovalRequestDto(), _managerId, UserRole.Manager.ToString());

        // Assert
        await act.Should().ThrowAsync<ValidationException>()
            .WithMessage("*Cannot request approval when workflow is in state 'Created'*");
    }

    [Fact]
    public async Task ApproveWorkflow_ByAuthorizedManager_SetsStateToApprovedAndRecordsAudit()
    {
        // TC-AP-004: Authorized Manager Approval & Audit Logging
        // Arrange
        await _sut.CreateApprovalRequestAsync(_workflowId, new CreateApprovalRequestDto(), _managerId, UserRole.Manager.ToString());

        // Act
        var result = await _sut.ApproveWorkflowAsync(_workflowId, new ApprovalDecisionRequestDto
        {
            DecisionReason = "Quotation line items verified against fair market labor rates; approved for execution."
        }, _managerId, UserRole.Manager.ToString());

        // Assert
        result.Status.Should().Be(ApprovalStatus.Approved);
        result.Decision.Should().Be(ApprovalDecision.Approve);
        result.DecisionReason.Should().Contain("fair market labor rates");
        result.DecidedAtUtc.Should().NotBeNull();

        var wf = await _dbContext.WorkflowInstances.FindAsync(_workflowId);
        wf!.CurrentState.Should().Be(WorkflowState.Approved);

        var audit = await _dbContext.AuditEvents.Where(a => a.WorkflowInstanceId == _workflowId && a.EventType == AuditEventType.ApprovalApproved).FirstOrDefaultAsync();
        audit.Should().NotBeNull();
        audit!.Description.Should().Contain("approved by Manager");
    }

    [Fact]
    public async Task ApproveWorkflow_ByAdmin_Succeeds()
    {
        // TC-AP-005: Administrator Executive Override Approval
        // Arrange
        await _sut.CreateApprovalRequestAsync(_workflowId, new CreateApprovalRequestDto(), _managerId, UserRole.Manager.ToString());

        // Act
        var result = await _sut.ApproveWorkflowAsync(_workflowId, new ApprovalDecisionRequestDto
        {
            DecisionReason = "Executive administrator override approval."
        }, _adminId, UserRole.Admin.ToString());

        // Assert
        result.Status.Should().Be(ApprovalStatus.Approved);
        result.Decision.Should().Be(ApprovalDecision.Approve);
    }

    [Fact]
    public async Task ApproveWorkflow_ByUnauthorizedOwnerOrProvider_ThrowsUnauthorizedAccessException()
    {
        // TC-AP-006: RBAC Privilege Escalation Prevention
        // Arrange
        await _sut.CreateApprovalRequestAsync(_workflowId, new CreateApprovalRequestDto(), _managerId, UserRole.Manager.ToString());

        // Act 1: Owner attempts to approve
        var ownerAct = async () => await _sut.ApproveWorkflowAsync(_workflowId, new ApprovalDecisionRequestDto
        {
            DecisionReason = "Owner attempting approval"
        }, _ownerId, UserRole.Owner.ToString());

        // Act 2: Service Provider attempts to approve
        var providerAct = async () => await _sut.ApproveWorkflowAsync(_workflowId, new ApprovalDecisionRequestDto
        {
            DecisionReason = "Provider self-approving quote"
        }, _providerId, UserRole.ServiceProvider.ToString());

        // Assert
        await ownerAct.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("*Only users with the 'Manager' or 'Admin' role are authorized*");

        await providerAct.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("*Only users with the 'Manager' or 'Admin' role are authorized*");
    }

    [Fact]
    public async Task ApproveWorkflow_WhenWorkflowNotAwaitingApproval_ThrowsValidationException()
    {
        // TC-AP-007: Approval Precondition Guard
        // Arrange: Workflow is currently in AiValidation, no approval request made
        // Act
        var act = async () => await _sut.ApproveWorkflowAsync(_workflowId, new ApprovalDecisionRequestDto
        {
            DecisionReason = "Trying to approve prematurely"
        }, _managerId, UserRole.Manager.ToString());

        // Assert
        await act.Should().ThrowAsync<ValidationException>()
            .WithMessage("*must be 'AwaitingApproval'*");
    }

    [Fact]
    public async Task RejectWorkflow_ByManager_SetsStateToRejectedAndRecordsReason()
    {
        // TC-AP-008: Workflow Rejection Execution
        // Arrange
        await _sut.CreateApprovalRequestAsync(_workflowId, new CreateApprovalRequestDto(), _managerId, UserRole.Manager.ToString());

        // Act
        var result = await _sut.RejectWorkflowAsync(_workflowId, new ApprovalDecisionRequestDto
        {
            DecisionReason = "Quotation exceeds maximum allowable contingency budget."
        }, _managerId, UserRole.Manager.ToString());

        // Assert
        result.Status.Should().Be(ApprovalStatus.Rejected);
        result.Decision.Should().Be(ApprovalDecision.Reject);

        var wf = await _dbContext.WorkflowInstances.FindAsync(_workflowId);
        wf!.CurrentState.Should().Be(WorkflowState.Rejected);
        wf.CompletedAtUtc.Should().NotBeNull();
    }

    [Fact]
    public async Task RequestRevision_ByManager_SetsStateToRevisionRequestedAndAllowsResubmission()
    {
        // TC-AP-009: Human-in-the-Loop Revision Request
        // Arrange
        await _sut.CreateApprovalRequestAsync(_workflowId, new CreateApprovalRequestDto(), _managerId, UserRole.Manager.ToString());

        // Act
        var result = await _sut.RequestRevisionAsync(_workflowId, new RevisionRequestDto
        {
            RevisionComment = "Please request contractor to specify waterproofing membrane brand & warranty duration.",
            DecisionReason = "Incomplete quotation specifications"
        }, _managerId, UserRole.Manager.ToString());

        // Assert
        result.Status.Should().Be(ApprovalStatus.RevisionRequested);
        result.Decision.Should().Be(ApprovalDecision.RequestRevision);
        result.RevisionComment.Should().Contain("waterproofing membrane");

        var wf = await _dbContext.WorkflowInstances.FindAsync(_workflowId);
        wf!.CurrentState.Should().Be(WorkflowState.RevisionRequested);

        // Can now transition back to QuotationReview
        var reReview = await _sut.TransitionWorkflowAsync(_workflowId, new TransitionWorkflowRequestDto
        {
            TargetState = WorkflowState.QuotationReview,
            Reason = "Contractor updated quotation with membrane specification."
        }, _managerId, UserRole.Manager.ToString());

        reReview.CurrentState.Should().Be(WorkflowState.QuotationReview);
    }

    [Fact]
    public async Task RejectWorkflow_ByUnauthorizedRole_ThrowsUnauthorizedAccessException()
    {
        // TC-AP-010: Rejection RBAC Enforcement
        // Arrange
        await _sut.CreateApprovalRequestAsync(_workflowId, new CreateApprovalRequestDto(), _managerId, UserRole.Manager.ToString());

        // Act: Representative attempts to reject workflow
        var act = async () => await _sut.RejectWorkflowAsync(_workflowId, new ApprovalDecisionRequestDto
        {
            DecisionReason = "Representative trying to reject"
        }, _providerId, UserRole.ServiceProvider.ToString());

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("*Only users with the 'Manager' or 'Admin' role are authorized*");
    }

    [Fact]
    public async Task ApproveWorkflow_ByAuthorizedManager_SuccessfullyApprovesWorkflow()
    {
        // Arrange
        await _sut.CreateApprovalRequestAsync(_workflowId, new CreateApprovalRequestDto(), _managerId, UserRole.Manager.ToString());

        // Act
        var result = await _sut.ApproveWorkflowAsync(_workflowId, new ApprovalDecisionRequestDto
        {
            DecisionReason = "Cost within verified estimate"
        }, _managerId, UserRole.Manager.ToString());

        // Assert
        result.Should().NotBeNull();
        result.Status.Should().Be(ApprovalStatus.Approved);
        result.Decision.Should().Be(ApprovalDecision.Approve);

        var wf = await _dbContext.WorkflowInstances.FindAsync(_workflowId);
        wf!.CurrentState.Should().Be(WorkflowState.Approved);
    }

    [Fact]
    public async Task ApproveWorkflow_ByUnauthorizedRole_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        await _sut.CreateApprovalRequestAsync(_workflowId, new CreateApprovalRequestDto(), _managerId, UserRole.Manager.ToString());

        // Act: ServiceProvider attempts to approve
        var act = async () => await _sut.ApproveWorkflowAsync(_workflowId, new ApprovalDecisionRequestDto
        {
            DecisionReason = "Self-approving job"
        }, _providerId, UserRole.ServiceProvider.ToString());

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("*Only users with the 'Manager' or 'Admin' role are authorized*");
    }

    [Fact]
    public async Task RequestRevision_ByUnauthorizedRole_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        await _sut.CreateApprovalRequestAsync(_workflowId, new CreateApprovalRequestDto(), _managerId, UserRole.Manager.ToString());

        // Act: Owner attempts to perform manager revision request
        var act = async () => await _sut.RequestRevisionAsync(_workflowId, new RevisionRequestDto
        {
            RevisionComment = "Owner requesting revision directly",
            DecisionReason = "Owner notes"
        }, _ownerId, UserRole.Owner.ToString());

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("*Only users with the 'Manager' or 'Admin' role are authorized*");
    }

    [Fact]
    public async Task CreateApprovalRequest_ByUnauthorizedUser_ThrowsUnauthorizedAccessException()
    {
        // Arrange: Random unauthorized user
        var unauthorizedUserId = Guid.NewGuid();

        // Act
        var act = async () => await _sut.CreateApprovalRequestAsync(_workflowId, new CreateApprovalRequestDto(), unauthorizedUserId, "Contractor");

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    public void Dispose()
    {
        _dbContext.Dispose();
    }
}
