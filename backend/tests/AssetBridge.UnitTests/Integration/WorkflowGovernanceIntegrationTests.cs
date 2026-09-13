using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using AssetBridge.Application.Common.Models;
using AssetBridge.Application.DTOs.Assets;
using AssetBridge.Application.DTOs.Auth;
using AssetBridge.Application.DTOs.Incidents;
using AssetBridge.Application.DTOs.Workflow;
using AssetBridge.Domain.Enums;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace AssetBridge.UnitTests.Integration;

public class WorkflowGovernanceIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;
    private readonly System.Text.Json.JsonSerializerOptions _jsonOptions;

    public WorkflowGovernanceIntegrationTests(WebApplicationFactory<Program> factory)
    {
        var inMemoryFactory = factory.WithWebHostBuilder(builder =>
        {
            builder.UseSetting("ConnectionStrings:DefaultConnection", "");
        });

        _client = inMemoryFactory.CreateClient();
        _jsonOptions = new System.Text.Json.JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() }
        };
    }

    private async Task<string> RegisterAndLoginAsync(string name, string email, string role)
    {
        var registerDto = new RegisterRequestDto
        {
            Email = email,
            Password = "SecurePassword123!",
            FullName = name,
            PhoneNumber = "+94771234567",
            Role = Enum.Parse<UserRole>(role)
        };

        var regRes = await _client.PostAsJsonAsync("/api/auth/register", registerDto);
        regRes.StatusCode.Should().Be(HttpStatusCode.Created);

        var loginDto = new LoginRequestDto
        {
            Email = email,
            Password = "SecurePassword123!"
        };

        var loginRes = await _client.PostAsJsonAsync("/api/auth/login", loginDto);
        loginRes.StatusCode.Should().Be(HttpStatusCode.OK);

        var loginBody = await loginRes.Content.ReadFromJsonAsync<ApiResponse<LoginResponseDto>>(_jsonOptions);
        loginBody.Should().NotBeNull();
        loginBody!.Data.Should().NotBeNull();
        return loginBody.Data!.Token;
    }

    [Fact]
    public async Task CompleteWorkflowGovernanceLifecycle_EnforcesStateMachine_ApprovalSecurity_And_Continuity()
    {
        var runId = Guid.NewGuid().ToString("N")[..8];
        var managerToken = await RegisterAndLoginAsync("Manager Perera", $"manager_{runId}@assetbridge.lk", "Manager");
        var ownerToken = await RegisterAndLoginAsync("Owner Silva", $"owner_{runId}@assetbridge.lk", "Owner");
        var providerToken = await RegisterAndLoginAsync("Provider Repairs", $"provider_{runId}@assetbridge.lk", "ServiceProvider");

        // 1. Owner registers an Asset
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", ownerToken);
        var createAssetRes = await _client.PostAsJsonAsync("/api/assets", new CreateAssetRequestDto
        {
            Name = "Bentota Riverfront Villa",
            PropertyType = PropertyType.Villa,
            AddressLine1 = "88 Riverside Drive",
            City = "Bentota",
            District = "Galle",
            PostalCode = "80500"
        });
        createAssetRes.StatusCode.Should().Be(HttpStatusCode.Created);
        var asset = (await createAssetRes.Content.ReadFromJsonAsync<ApiResponse<AssetResponseDto>>(_jsonOptions))!.Data!;

        // 2. Owner reports an Incident
        var createIncidentRes = await _client.PostAsJsonAsync("/api/incidents", new CreateIncidentRequestDto
        {
            AssetId = asset.Id,
            Title = "Water pressure pump failed in main building",
            Description = "No water flowing to 2nd floor bathrooms. Pump making grinding noise.",
            Category = IncidentCategory.Plumbing,
            Priority = IncidentPriority.High,
            EstimatedBudget = 85000m
        });
        createIncidentRes.StatusCode.Should().Be(HttpStatusCode.Created);
        var incident = (await createIncidentRes.Content.ReadFromJsonAsync<ApiResponse<IncidentResponseDto>>(_jsonOptions))!.Data!;

        // 3. Manager creates Workflow for Incident
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", managerToken);
        var createWfRes = await _client.PostAsJsonAsync("/api/workflows", new CreateWorkflowRequestDto
        {
            IncidentId = incident.Id,
            InitialNotes = "AI Incident Planner initialized lifecycle governance."
        });
        createWfRes.StatusCode.Should().Be(HttpStatusCode.Created);
        var workflow = (await createWfRes.Content.ReadFromJsonAsync<ApiResponse<WorkflowInstanceDto>>(_jsonOptions))!.Data!;
        workflow.CurrentState.Should().Be(WorkflowState.Created);

        // 4. Progress state machine: Created -> Planning -> ProviderSelection -> QuotationReview -> AiValidation
        var statesToProgress = new[]
        {
            (WorkflowState.Planning, "Incident Planner Agent generated diagnosis plan"),
            (WorkflowState.ProviderSelection, "Provider Matcher Agent identified 3 verified contractors"),
            (WorkflowState.QuotationReview, "Contractor submitted formal quote of LKR 72,000"),
            (WorkflowState.AiValidation, "Quotation Auditor Agent validated line items against fair market rates")
        };

        foreach (var (targetState, reason) in statesToProgress)
        {
            var transRes = await _client.PostAsJsonAsync($"/api/workflows/{workflow.Id}/transition", new TransitionWorkflowRequestDto
            {
                TargetState = targetState,
                Reason = reason
            });
            transRes.StatusCode.Should().Be(HttpStatusCode.OK);
            var transBody = (await transRes.Content.ReadFromJsonAsync<ApiResponse<WorkflowInstanceDto>>(_jsonOptions))!.Data!;
            transBody.CurrentState.Should().Be(targetState);
        }

        // 5. Submit Human Approval Request -> Transitions state to AwaitingApproval
        var appReqRes = await _client.PostAsJsonAsync($"/api/workflows/{workflow.Id}/approval-request", new CreateApprovalRequestDto
        {
            InitialNotes = "Quote is LKR 72,000 which is within owner's LKR 85,000 budget. Ready for human authorization."
        });
        appReqRes.StatusCode.Should().Be(HttpStatusCode.Created);
        var appReq = (await appReqRes.Content.ReadFromJsonAsync<ApiResponse<ApprovalRequestDto>>(_jsonOptions))!.Data!;
        appReq.Status.Should().Be(ApprovalStatus.Pending);

        // Verify state is now AwaitingApproval
        var getWfRes = await _client.GetAsync($"/api/workflows/{workflow.Id}");
        var wfCurrent = (await getWfRes.Content.ReadFromJsonAsync<ApiResponse<WorkflowInstanceDto>>(_jsonOptions))!.Data!;
        wfCurrent.CurrentState.Should().Be(WorkflowState.AwaitingApproval);

        // 6. STRICT SECURITY TEST: Service Provider attempts to approve -> Must return 403 Forbidden
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", providerToken);
        var providerApproveRes = await _client.PostAsJsonAsync($"/api/workflows/{workflow.Id}/approve", new ApprovalDecisionRequestDto
        {
            DecisionReason = "Provider trying to approve own quote"
        });
        providerApproveRes.StatusCode.Should().Be(HttpStatusCode.Forbidden);

        // 7. STRICT SECURITY TEST: Owner attempts to approve manager-level execution -> Must return 403 Forbidden
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", ownerToken);
        var ownerApproveRes = await _client.PostAsJsonAsync($"/api/workflows/{workflow.Id}/approve", new ApprovalDecisionRequestDto
        {
            DecisionReason = "Owner attempting to trigger contractor dispatch directly"
        });
        ownerApproveRes.StatusCode.Should().Be(HttpStatusCode.Forbidden);

        // 8. Authorized Manager Approves Workflow -> Must return 200 OK and transition to Approved
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", managerToken);
        var managerApproveRes = await _client.PostAsJsonAsync($"/api/workflows/{workflow.Id}/approve", new ApprovalDecisionRequestDto
        {
            DecisionReason = "Approved by Operations Manager after reviewing verified pump warranty & parts quote."
        });
        managerApproveRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var approvedBody = (await managerApproveRes.Content.ReadFromJsonAsync<ApiResponse<ApprovalRequestDto>>(_jsonOptions))!.Data!;
        approvedBody.Status.Should().Be(ApprovalStatus.Approved);
        approvedBody.Decision.Should().Be(ApprovalDecision.Approve);

        // 9. Advance to Execution -> CompletionReview -> Completed -> FollowUp
        var postApprovalStates = new[]
        {
            (WorkflowState.Execution, "Contractor dispatched on-site for pump replacement"),
            (WorkflowState.CompletionReview, "Pump replaced and pressure gauge verified at 45 PSI"),
            (WorkflowState.Completed, "Repairs concluded successfully"),
            (WorkflowState.FollowUp, "Continuous property monitoring scheduled")
        };

        foreach (var (targetState, reason) in postApprovalStates)
        {
            var transRes = await _client.PostAsJsonAsync($"/api/workflows/{workflow.Id}/transition", new TransitionWorkflowRequestDto
            {
                TargetState = targetState,
                Reason = reason
            });
            transRes.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        // 10. Create Property Continuity Follow-Up Task
        var createFollowUpRes = await _client.PostAsJsonAsync("/api/follow-ups", new CreateFollowUpTaskDto
        {
            WorkflowInstanceId = workflow.Id,
            AssetId = asset.Id,
            Title = "60-Day Water Pump Pressure & Electrical Relay Check",
            Description = "Inspect pump dry-run protection sensor and check electrical breaker amperage.",
            DueDateUtc = DateTime.UtcNow.AddDays(60),
            Priority = FollowUpPriority.High
        });
        createFollowUpRes.StatusCode.Should().Be(HttpStatusCode.Created);
        var followUp = (await createFollowUpRes.Content.ReadFromJsonAsync<ApiResponse<FollowUpTaskDto>>(_jsonOptions))!.Data!;
        followUp.Title.Should().Contain("60-Day Water Pump Pressure");
        followUp.AssetName.Should().Be("Bentota Riverfront Villa");

        // 11. Verify Timeline and Audit records
        var timelineRes = await _client.GetAsync($"/api/workflows/{workflow.Id}/timeline");
        timelineRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var timeline = (await timelineRes.Content.ReadFromJsonAsync<ApiResponse<WorkflowTimelineDto>>(_jsonOptions))!.Data!;
        timeline.Steps.Should().NotBeEmpty();
        timeline.AuditEvents.Should().NotBeEmpty();
        timeline.Approvals.Should().HaveCount(1);
        timeline.Approvals.First().Status.Should().Be(ApprovalStatus.Approved);

        // 12. Verify Dashboard Metrics endpoint
        var metricsRes = await _client.GetAsync("/api/workflows/dashboard/metrics");
        metricsRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var metrics = (await metricsRes.Content.ReadFromJsonAsync<ApiResponse<WorkflowDashboardMetricsDto>>(_jsonOptions))!.Data!;
        metrics.CompletedWorkflowsCount.Should().BeGreaterThanOrEqualTo(1);
    }
}
