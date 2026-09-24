using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using AssetBridge.Application.Common.Models;
using AssetBridge.Application.DTOs.Assets;
using AssetBridge.Application.DTOs.Auth;
using AssetBridge.Application.DTOs.Incidents;
using AssetBridge.Domain.Enums;
using AssetBridge.Infrastructure.Persistence;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace AssetBridge.UnitTests.Integration;

public class AssetAndIncidentIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;
    private readonly System.Text.Json.JsonSerializerOptions _jsonOptions;

    public AssetAndIncidentIntegrationTests(WebApplicationFactory<Program> factory)
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

    [Fact]
    public async Task EndToEndFlow_Register_Login_CreateAsset_CreateIncident_ViewHistory()
    {
        // 1. Register a new Owner
        var uniqueEmail = $"owner_{Guid.NewGuid():N}@assetbridge.ai";
        var registerDto = new RegisterRequestDto
        {
            Email = uniqueEmail,
            Password = "SecurePassword123!",
            FullName = "Moosika Ramanathan",
            PhoneNumber = "+94771234567",
            Role = UserRole.Owner
        };

        var registerRes = await _client.PostAsJsonAsync("/api/auth/register", registerDto);
        registerRes.StatusCode.Should().Be(HttpStatusCode.Created);

        // 2. Login to obtain JWT Token
        var loginDto = new LoginRequestDto
        {
            Email = uniqueEmail,
            Password = "SecurePassword123!"
        };

        var loginRes = await _client.PostAsJsonAsync("/api/auth/login", loginDto);
        loginRes.StatusCode.Should().Be(HttpStatusCode.OK);

        var loginPayload = await loginRes.Content.ReadFromJsonAsync<ApiResponse<LoginResponseDto>>(_jsonOptions);
        loginPayload.Should().NotBeNull();
        loginPayload!.Data.Should().NotBeNull();
        var jwtToken = loginPayload.Data!.Token;
        jwtToken.Should().NotBeNullOrWhiteSpace();

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", jwtToken);

        // 3. Create a Property Asset
        var createAssetDto = new CreateAssetRequestDto
        {
            Name = "Kandy View Bungalow",
            PropertyType = PropertyType.SingleFamilyHouse,
            AddressLine1 = "77 Rajapihilla Mawatha",
            City = "Kandy",
            District = "Kandy",
            PostalCode = "20000",
            Latitude = 7.2906,
            Longitude = 80.6337,
            Description = "Residential property in hill country"
        };

        var createAssetRes = await _client.PostAsJsonAsync("/api/assets", createAssetDto);
        createAssetRes.StatusCode.Should().Be(HttpStatusCode.Created);

        var assetPayload = await createAssetRes.Content.ReadFromJsonAsync<ApiResponse<AssetResponseDto>>(_jsonOptions);
        assetPayload.Should().NotBeNull();
        var assetId = assetPayload!.Data!.Id;

        // 4. Retrieve the Asset by ID
        var getAssetRes = await _client.GetAsync($"/api/assets/{assetId}");
        getAssetRes.StatusCode.Should().Be(HttpStatusCode.OK);

        // 5. Create an Incident for the Asset
        var createIncidentDto = new CreateIncidentRequestDto
        {
            AssetId = assetId,
            Title = "Kitchen Water Leak",
            Description = "Main supply pipe under kitchen counter has high pressure burst leak.",
            Category = IncidentCategory.Plumbing,
            Priority = IncidentPriority.High,
            EstimatedBudget = 75000,
            LocationDetails = "Kitchen lower cabinet pipe connection"
        };

        var createIncidentRes = await _client.PostAsJsonAsync("/api/incidents", createIncidentDto);
        createIncidentRes.StatusCode.Should().Be(HttpStatusCode.Created);

        var incidentPayload = await createIncidentRes.Content.ReadFromJsonAsync<ApiResponse<IncidentResponseDto>>(_jsonOptions);
        incidentPayload.Should().NotBeNull();
        var incidentId = incidentPayload!.Data!.Id;

        // 6. Upload Evidence for the Incident
        var addEvidenceDto = new AddIncidentEvidenceRequestDto
        {
            FileName = "kitchen_pipe_burst.jpg",
            FileUrl = "https://storage.assetbridge.ai/incidents/kitchen_pipe_burst.jpg",
            FileType = "image/jpeg",
            FileSizeBytes = 1048576,
            EvidenceType = EvidenceType.Photo,
            Caption = "Water accumulating under cabinet"
        };

        var addEvidenceRes = await _client.PostAsJsonAsync($"/api/incidents/{incidentId}/evidence", addEvidenceDto);
        addEvidenceRes.StatusCode.Should().Be(HttpStatusCode.Created);

        // 7. Verify Property Continuity History Timeline
        var getHistoryRes = await _client.GetAsync($"/api/assets/{assetId}/history");
        getHistoryRes.StatusCode.Should().Be(HttpStatusCode.OK);

        var historyPayload = await getHistoryRes.Content.ReadFromJsonAsync<ApiResponse<List<AssetHistoryResponseDto>>>(_jsonOptions);
        historyPayload.Should().NotBeNull();
        historyPayload!.Data.Should().NotBeEmpty();
        historyPayload.Data!.Should().Contain(h => h.EventType == AssetHistoryEventType.AssetCreated);
        historyPayload.Data!.Should().Contain(h => h.EventType == AssetHistoryEventType.IncidentReported);
        historyPayload.Data!.Should().Contain(h => h.EventType == AssetHistoryEventType.EvidenceAdded);
    }
}
