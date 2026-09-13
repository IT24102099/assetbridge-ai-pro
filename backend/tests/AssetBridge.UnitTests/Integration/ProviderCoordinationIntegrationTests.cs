using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using AssetBridge.Application.Common.Models;
using AssetBridge.Application.DTOs.Assets;
using AssetBridge.Application.DTOs.Auth;
using AssetBridge.Application.DTOs.Incidents;
using AssetBridge.Application.DTOs.Providers;
using AssetBridge.Application.DTOs.Representatives;
using AssetBridge.Domain.Enums;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace AssetBridge.UnitTests.Integration;

public class ProviderCoordinationIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;
    private readonly System.Text.Json.JsonSerializerOptions _jsonOptions;

    public ProviderCoordinationIntegrationTests(WebApplicationFactory<Program> factory)
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
    public async Task EndToEndProviderCoordinationFlow_Register_Profile_Skills_Availability_Verification_Matching()
    {
        // 1. Create and Login Users
        var managerToken = await RegisterAndLoginAsync("Ops Manager", $"manager_{Guid.NewGuid():N}@assetbridge.ai", "Manager");
        var ownerToken = await RegisterAndLoginAsync("Overseas Owner", $"owner_{Guid.NewGuid():N}@assetbridge.ai", "Owner");
        var providerToken = await RegisterAndLoginAsync("Kandy Expert Plumber", $"provider_{Guid.NewGuid():N}@assetbridge.ai", "ServiceProvider");

        // 2. Owner Creates Asset in Kandy
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", ownerToken);
        var createAssetDto = new CreateAssetRequestDto
        {
            Name = "Victoria View Villa",
            PropertyType = PropertyType.SingleFamilyHouse,
            AddressLine1 = "45 Lake Round Road",
            City = "Kandy",
            District = "Kandy",
            Latitude = 7.2906,
            Longitude = 80.6337
        };

        var assetRes = await _client.PostAsJsonAsync("/api/assets", createAssetDto);
        assetRes.StatusCode.Should().Be(HttpStatusCode.Created);
        var assetPayload = await assetRes.Content.ReadFromJsonAsync<ApiResponse<AssetResponseDto>>(_jsonOptions);
        var assetId = assetPayload!.Data!.Id;

        // 3. Owner Creates Plumbing Incident
        var targetDate = DateTime.UtcNow.AddDays(5).Date;
        var createIncidentDto = new CreateIncidentRequestDto
        {
            AssetId = assetId,
            Title = "Burst Pipe under Bathroom Sink",
            Description = "Water leaking heavily into ground floor ceiling",
            Category = IncidentCategory.Plumbing,
            Priority = IncidentPriority.High,
            EstimatedBudget = 50000,
            RequiredByUtc = targetDate
        };

        var incidentRes = await _client.PostAsJsonAsync("/api/incidents", createIncidentDto);
        incidentRes.StatusCode.Should().Be(HttpStatusCode.Created);
        var incidentPayload = await incidentRes.Content.ReadFromJsonAsync<ApiResponse<IncidentResponseDto>>(_jsonOptions);
        var incidentId = incidentPayload!.Data!.Id;

        // 4. Contractor Registers Profile
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", providerToken);
        var createProviderDto = new CreateServiceProviderRequestDto
        {
            BusinessName = "Lanka Plumbing Masters",
            ContactPerson = "Sunil Perera",
            PhoneNumber = "+94777654321",
            Email = "sunil@lankaplumbing.lk",
            PrimaryDistrict = "Kandy",
            City = "Kandy",
            BaseLatitude = 7.2950,
            BaseLongitude = 80.6360,
            ServiceRadiusKm = 25.0
        };

        var providerRes = await _client.PostAsJsonAsync("/api/providers", createProviderDto);
        providerRes.StatusCode.Should().Be(HttpStatusCode.Created);
        var providerPayload = await providerRes.Content.ReadFromJsonAsync<ApiResponse<ServiceProviderResponseDto>>(_jsonOptions);
        var providerId = providerPayload!.Data!.Id;

        // 5. Contractor Registers Trade Skill
        var addSkillDto = new AddProviderSkillRequestDto
        {
            Category = IncidentCategory.Plumbing,
            SkillName = "Master Pipe & Sanitary Fitting",
            YearsOfExperience = 8,
            IsPrimary = true
        };

        var skillRes = await _client.PostAsJsonAsync($"/api/providers/{providerId}/skills", addSkillDto);
        skillRes.StatusCode.Should().Be(HttpStatusCode.Created);

        // 6. Contractor Registers Availability Slot
        var addAvailabilityDto = new AddProviderAvailabilityRequestDto
        {
            AvailableDateUtc = targetDate,
            StartTime = TimeSpan.FromHours(8),
            EndTime = TimeSpan.FromHours(17),
            Status = AvailabilityStatus.Available
        };

        var availRes = await _client.PostAsJsonAsync($"/api/providers/{providerId}/availability", addAvailabilityDto);
        availRes.StatusCode.Should().Be(HttpStatusCode.Created);

        // 7. Manager Reviews and Approves Provider Verification
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", managerToken);
        var verifyDto = new UpdateVerificationRequestDto
        {
            VerificationStatus = VerificationStatus.Verified,
            VerificationNotes = "Verified business registration and certified trade credentials."
        };

        var verifyRes = await _client.PatchAsJsonAsync($"/api/providers/{providerId}/verification", verifyDto);
        verifyRes.StatusCode.Should().Be(HttpStatusCode.OK);

        // 8. Owner Requests Provider Match for the Incident
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", ownerToken);
        var matchRequestDto = new ProviderMatchingRequestDto
        {
            IncidentId = incidentId,
            MaxResults = 5
        };

        var matchRes = await _client.PostAsJsonAsync("/api/providers/match", matchRequestDto);
        matchRes.StatusCode.Should().Be(HttpStatusCode.OK);

        var matchPayload = await matchRes.Content.ReadFromJsonAsync<ApiResponse<ProviderMatchingResultDto>>(_jsonOptions);
        matchPayload.Should().NotBeNull();
        matchPayload!.Data.Should().NotBeNull();
        matchPayload.Data!.Candidates.Should().NotBeEmpty();

        var topCandidate = matchPayload.Data.Candidates.First();
        topCandidate.ProviderId.Should().Be(providerId);
        topCandidate.BusinessName.Should().Be("Lanka Plumbing Masters");
        topCandidate.HasRequiredSkill.Should().BeTrue();
        topCandidate.IsAvailableOnRequiredDate.Should().BeTrue();
        topCandidate.DistanceKm.Should().BeInRange(0.1, 5.0);
        topCandidate.MatchScore.Should().BeGreaterThan(75.0);
        topCandidate.ExplanationReasons.Should().Contain(r => r.Contains("Verified"));
        topCandidate.ExplanationReasons.Should().Contain(r => r.Contains("Master Pipe"));
        topCandidate.ExplanationReasons.Should().Contain(r => r.Contains("available"));
    }
}
