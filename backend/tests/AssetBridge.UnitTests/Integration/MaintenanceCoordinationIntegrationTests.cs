using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using AssetBridge.Application.Common.Models;
using AssetBridge.Application.DTOs.Assets;
using AssetBridge.Application.DTOs.Auth;
using AssetBridge.Application.DTOs.Incidents;
using AssetBridge.Application.DTOs.Inspections;
using AssetBridge.Application.DTOs.Maintenance;
using AssetBridge.Application.DTOs.Providers;
using AssetBridge.Application.DTOs.Representatives;
using AssetBridge.Domain.Enums;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace AssetBridge.UnitTests.Integration;

public class MaintenanceCoordinationIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;
    private readonly System.Text.Json.JsonSerializerOptions _jsonOptions;

    public MaintenanceCoordinationIntegrationTests(WebApplicationFactory<Program> factory)
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

        var loginPayload = await loginRes.Content.ReadFromJsonAsync<ApiResponse<LoginResponseDto>>(_jsonOptions);
        return loginPayload!.Data!.Token;
    }

    [Fact]
    public async Task EndToEndMaintenanceWorkflow_Incident_Inspection_Findings_Quotation_Budget_Comparison_Job_History()
    {
        // 1. Authenticate Users
        var managerToken = await RegisterAndLoginAsync("Ops Manager", $"m3_mgr_{Guid.NewGuid():N}@assetbridge.ai", "Manager");
        var ownerToken = await RegisterAndLoginAsync("Overseas Owner", $"m3_own_{Guid.NewGuid():N}@assetbridge.ai", "Owner");
        var providerToken = await RegisterAndLoginAsync("Certified Plumber", $"m3_pro_{Guid.NewGuid():N}@assetbridge.ai", "ServiceProvider");

        // 2. Owner Creates Asset & Incident
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", ownerToken);
        var assetRes = await _client.PostAsJsonAsync("/api/assets", new CreateAssetRequestDto
        {
            Name = "Kandy View Residence",
            PropertyType = PropertyType.SingleFamilyHouse,
            AddressLine1 = "88 Lake Road",
            City = "Kandy",
            District = "Kandy",
            Latitude = 7.2906,
            Longitude = 80.6337
        });
        assetRes.StatusCode.Should().Be(HttpStatusCode.Created);
        var assetPayload = await assetRes.Content.ReadFromJsonAsync<ApiResponse<AssetResponseDto>>(_jsonOptions);
        var assetId = assetPayload!.Data!.Id;

        var incidentRes = await _client.PostAsJsonAsync("/api/incidents", new CreateIncidentRequestDto
        {
            AssetId = assetId,
            Title = "Severe Underground Pipe Burst",
            Description = "Water flooding the garden path",
            Category = IncidentCategory.Plumbing,
            Priority = IncidentPriority.Emergency,
            EstimatedBudget = 75000 // 75,000 LKR Budget
        });
        incidentRes.StatusCode.Should().Be(HttpStatusCode.Created);
        var incidentPayload = await incidentRes.Content.ReadFromJsonAsync<ApiResponse<IncidentResponseDto>>(_jsonOptions);
        var incidentId = incidentPayload!.Data!.Id;

        // 3. Provider Registers Profile & Manager Verifies
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", providerToken);
        var providerRes = await _client.PostAsJsonAsync("/api/providers", new CreateServiceProviderRequestDto
        {
            BusinessName = "Kandy Pipe Masters",
            ContactPerson = "Sunil Bandara",
            PhoneNumber = "+94772345678",
            Email = "sunil@pipemasters.lk",
            PrimaryDistrict = "Kandy",
            City = "Kandy",
            BaseLatitude = 7.2920,
            BaseLongitude = 80.6350,
            ServiceRadiusKm = 25.0
        });
        providerRes.StatusCode.Should().Be(HttpStatusCode.Created);
        var providerPayload = await providerRes.Content.ReadFromJsonAsync<ApiResponse<ServiceProviderResponseDto>>(_jsonOptions);
        var providerId = providerPayload!.Data!.Id;

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", managerToken);
        var verifyRes = await _client.PatchAsJsonAsync($"/api/providers/{providerId}/verification", new UpdateVerificationRequestDto
        {
            VerificationStatus = VerificationStatus.Verified
        });
        verifyRes.StatusCode.Should().Be(HttpStatusCode.OK);

        // 4. Provider Schedules and Conducts Inspection
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", providerToken);
        var inspectionRes = await _client.PostAsJsonAsync("/api/inspections", new CreateInspectionRequestDto
        {
            IncidentId = incidentId,
            InspectorProviderId = providerId,
            ScheduledAtUtc = DateTime.UtcNow.AddDays(1),
            Notes = "On-site assessment of underground pipe burst"
        });
        inspectionRes.StatusCode.Should().Be(HttpStatusCode.Created);
        var inspectionPayload = await inspectionRes.Content.ReadFromJsonAsync<ApiResponse<InspectionResponseDto>>(_jsonOptions);
        var inspectionId = inspectionPayload!.Data!.Id;

        // Add Finding
        var findingRes = await _client.PostAsJsonAsync($"/api/inspections/{inspectionId}/findings", new CreateInspectionFindingRequestDto
        {
            Description = "Main 2-inch PVC delivery line is ruptured due to ground shift",
            Severity = FindingSeverity.Critical,
            Recommendation = "Excavate 3m trench, replace ruptured segment with heavy-duty PVC and install flexible coupling."
        });
        findingRes.StatusCode.Should().Be(HttpStatusCode.Created);

        // Complete Inspection
        var completeInspectionRes = await _client.PatchAsJsonAsync($"/api/inspections/{inspectionId}/status", new UpdateInspectionStatusRequestDto
        {
            Status = InspectionStatus.Completed,
            Summary = "Completed inspection. Ruptured underground main pipe requires immediate trench excavation and replacement."
        });
        completeInspectionRes.StatusCode.Should().Be(HttpStatusCode.OK);

        // 5. Provider Submits Quotation
        var quotationRes = await _client.PostAsJsonAsync("/api/quotations", new CreateQuotationRequestDto
        {
            IncidentId = incidentId,
            ProviderId = providerId,
            ValidUntilUtc = DateTime.UtcNow.AddDays(14),
            Notes = "Includes excavation, pipe materials, pressure testing, and backfilling",
            TaxAndOtherCharges = 3500,
            Items = new List<CreateQuotationItemRequestDto>
            {
                new() { Description = "Heavy-Duty 2-inch Pressure PVC Pipe (6m)", Quantity = 1, UnitPrice = 12500 },
                new() { Description = "High-Pressure Flexible Couplings & Solvent", Quantity = 2, UnitPrice = 3000 },
                new() { Description = "Excavation & Plumbing Specialist Labor (2 technicians)", Quantity = 1, UnitPrice = 26000 }
            }
        });
        // Subtotal = 12500 + 6000 + 26000 = 44500. Total = 44500 + 3500 = 48000
        quotationRes.StatusCode.Should().Be(HttpStatusCode.Created);
        var quotationPayload = await quotationRes.Content.ReadFromJsonAsync<ApiResponse<QuotationResponseDto>>(_jsonOptions);
        var quotationId = quotationPayload!.Data!.Id;
        quotationPayload.Data.TotalAmount.Should().Be(48000);

        // 6. Check Budget (48,000 vs 75,000 budget -> within budget)
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", ownerToken);
        var budgetRes = await _client.PostAsJsonAsync("/api/quotations/check-budget", new BudgetCheckRequestDto
        {
            IncidentId = incidentId,
            QuotationId = quotationId
        });
        budgetRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var budgetPayload = await budgetRes.Content.ReadFromJsonAsync<ApiResponse<BudgetCheckResultDto>>(_jsonOptions);
        budgetPayload!.Data!.IsWithinBudget.Should().BeTrue();
        budgetPayload.Data.DifferenceAmount.Should().Be(27000); // 75000 - 48000
        budgetPayload.Data.BudgetUtilizationPercentage.Should().Be(64.0);

        // 7. Compare Quotations
        var compareRes = await _client.PostAsJsonAsync("/api/quotations/compare", new QuotationComparisonRequestDto
        {
            IncidentId = incidentId
        });
        compareRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var comparePayload = await compareRes.Content.ReadFromJsonAsync<ApiResponse<QuotationComparisonResultDto>>(_jsonOptions);
        comparePayload!.Data!.RecommendedQuotationId.Should().Be(quotationId);

        // 8. Owner Accepts Quotation
        var acceptRes = await _client.PatchAsJsonAsync($"/api/quotations/{quotationId}/status", new UpdateQuotationStatusRequestDto
        {
            Status = QuotationStatus.Accepted
        });
        acceptRes.StatusCode.Should().Be(HttpStatusCode.OK);

        // 9. Manager Schedules Maintenance Job
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", managerToken);
        var jobRes = await _client.PostAsJsonAsync("/api/maintenance-jobs", new CreateMaintenanceJobRequestDto
        {
            IncidentId = incidentId,
            ProviderId = providerId,
            InspectionId = inspectionId,
            Title = "Underground Main Pipe Repair & Replacement",
            Description = "Excavate and replace ruptured 2-inch pipe as per accepted quotation",
            ScheduledStartUtc = DateTime.UtcNow.AddDays(2),
            ScheduledEndUtc = DateTime.UtcNow.AddDays(3),
            ApprovedBudget = 48000
        });
        jobRes.StatusCode.Should().Be(HttpStatusCode.Created);
        var jobPayload = await jobRes.Content.ReadFromJsonAsync<ApiResponse<MaintenanceJobResponseDto>>(_jsonOptions);
        var jobId = jobPayload!.Data!.Id;

        // 10. Provider Marks Maintenance Job Completed
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", providerToken);
        var completeJobRes = await _client.PatchAsJsonAsync($"/api/maintenance-jobs/{jobId}/status", new UpdateMaintenanceJobStatusRequestDto
        {
            Status = MaintenanceJobStatus.Completed,
            ActualCost = 48000,
            CompletionNotes = "Replaced pipe segment, pressure tested at 4 bar with no leaks, backfilled neatly."
        });
        completeJobRes.StatusCode.Should().Be(HttpStatusCode.OK);

        // 11. Record Maintenance History & Verify Asset Maintenance Timeline
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", managerToken);
        var recordHistoryRes = await _client.PostAsJsonAsync($"/api/assets/{assetId}/maintenance-history", new RecordMaintenanceHistoryRequestDto
        {
            IncidentId = incidentId,
            MaintenanceJobId = jobId,
            EventType = MaintenanceHistoryEventType.JobCompleted,
            Title = "Underground Main Pipe Replacement Completed",
            Description = "Heavy duty PVC line replaced and pressure tested",
            RecordedCost = 48000
        });
        recordHistoryRes.StatusCode.Should().Be(HttpStatusCode.Created);

        // Query Asset Maintenance History
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", ownerToken);
        var getHistoryRes = await _client.GetAsync($"/api/assets/{assetId}/maintenance-history");
        getHistoryRes.StatusCode.Should().Be(HttpStatusCode.OK);

        var historyPayload = await getHistoryRes.Content.ReadFromJsonAsync<ApiResponse<List<MaintenanceHistoryResponseDto>>>(_jsonOptions);
        historyPayload!.Data!.Should().NotBeEmpty();
        historyPayload.Data!.First().RecordedCost.Should().Be(48000);
    }
}
