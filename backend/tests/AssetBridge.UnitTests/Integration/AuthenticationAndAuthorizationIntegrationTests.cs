using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using AssetBridge.Application.Common.Models;
using AssetBridge.Application.DTOs.Auth;
using AssetBridge.Domain.Enums;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;

namespace AssetBridge.UnitTests.Integration;

public class AuthenticationAndAuthorizationIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;
    private readonly JsonSerializerOptions _jsonOptions;

    public AuthenticationAndAuthorizationIntegrationTests(WebApplicationFactory<Program> factory)
    {
        var inMemoryFactory = factory.WithWebHostBuilder(builder =>
        {
            builder.UseSetting("ConnectionStrings:DefaultConnection", "");
        });

        _client = inMemoryFactory.CreateClient();
        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            Converters = { new JsonStringEnumConverter() }
        };
    }

    [Fact]
    public async Task RootEndpoint_ShouldReturnApiInformationAndEntryPoints()
    {
        var response = await _client.GetAsync("/");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadAsStringAsync();
        content.Should().Contain("AssetBridge AI API");
        content.Should().Contain("/swagger");
        content.Should().Contain("/health");
    }

    [Theory]
    [InlineData("/health")]
    [InlineData("/api/health")]
    public async Task HealthEndpoints_ShouldReturnHealthyStatus(string path)
    {
        var response = await _client.GetAsync(path);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadAsStringAsync();
        content.Should().Contain("Healthy");
        content.Should().Contain("AssetBridge AI API");
    }

    [Fact]
    public async Task Register_WithValidData_ShouldCreateUserAndReturnSafeProfile()
    {
        var uniqueEmail = $"owner_{Guid.NewGuid():N}@test.lk";
        var request = new RegisterRequestDto
        {
            Email = uniqueEmail,
            Password = "SecurePassword123!",
            FullName = "Sunil Perera",
            PhoneNumber = "+94771234567",
            Role = UserRole.Owner
        };

        var response = await _client.PostAsJsonAsync("/api/auth/register", request);
        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var payload = await response.Content.ReadFromJsonAsync<ApiResponse<UserProfileDto>>(_jsonOptions);
        payload.Should().NotBeNull();
        payload!.Success.Should().BeTrue();
        payload.Data.Should().NotBeNull();
        payload.Data!.Email.Should().Be(uniqueEmail.ToLowerInvariant());
        payload.Data.FullName.Should().Be("Sunil Perera");
        payload.Data.Role.Should().Be(UserRole.Owner);
        payload.Data.IsActive.Should().BeTrue();

        // Password hash must never be exposed
        var rawJson = await response.Content.ReadAsStringAsync();
        rawJson.Should().NotContain("PasswordHash");
        rawJson.Should().NotContain("SecurePassword123!");
    }

    [Fact]
    public async Task Register_WithDuplicateEmail_ShouldReturnBadRequest()
    {
        var email = $"dup_{Guid.NewGuid():N}@test.lk";
        var request = new RegisterRequestDto
        {
            Email = email,
            Password = "SecurePassword123!",
            FullName = "First User",
            Role = UserRole.Owner
        };

        var firstRes = await _client.PostAsJsonAsync("/api/auth/register", request);
        firstRes.StatusCode.Should().Be(HttpStatusCode.Created);

        // Attempt second registration with same email
        var duplicateRes = await _client.PostAsJsonAsync("/api/auth/register", request);
        duplicateRes.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var content = await duplicateRes.Content.ReadAsStringAsync();
        content.Should().Contain("already exists");
    }

    [Theory]
    [InlineData("not-an-email", "ValidPass123!")]
    [InlineData("valid@test.lk", "short")]
    public async Task Register_WithInvalidFields_ShouldFailValidation(string email, string password)
    {
        var request = new RegisterRequestDto
        {
            Email = email,
            Password = password,
            FullName = "Validation Test",
            Role = UserRole.Owner
        };

        var response = await _client.PostAsJsonAsync("/api/auth/register", request);
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Login_WithValidCredentials_ShouldReturnJwtTokenAndUserProfile()
    {
        var email = $"login_{Guid.NewGuid():N}@test.lk";
        var password = "SecurePassword123!";

        await _client.PostAsJsonAsync("/api/auth/register", new RegisterRequestDto
        {
            Email = email,
            Password = password,
            FullName = "Kamal Silva",
            Role = UserRole.Representative
        });

        var loginRes = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequestDto
        {
            Email = email,
            Password = password
        });

        loginRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var payload = await loginRes.Content.ReadFromJsonAsync<ApiResponse<LoginResponseDto>>(_jsonOptions);

        payload.Should().NotBeNull();
        payload!.Success.Should().BeTrue();
        payload.Data.Should().NotBeNull();
        payload.Data!.Token.Should().NotBeNullOrWhiteSpace();
        payload.Data.TokenType.Should().Be("Bearer");
        payload.Data.ExpiresInMinutes.Should().BeGreaterThan(0);
        payload.Data.User.Email.Should().Be(email.ToLowerInvariant());
        payload.Data.User.Role.Should().Be(UserRole.Representative);
    }

    [Fact]
    public async Task Login_WithInvalidPassword_ShouldReturnBadRequest()
    {
        var email = $"wrongpass_{Guid.NewGuid():N}@test.lk";
        await _client.PostAsJsonAsync("/api/auth/register", new RegisterRequestDto
        {
            Email = email,
            Password = "CorrectPassword123!",
            FullName = "Test User",
            Role = UserRole.Owner
        });

        var loginRes = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequestDto
        {
            Email = email,
            Password = "WrongPassword123!"
        });

        loginRes.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var content = await loginRes.Content.ReadAsStringAsync();
        content.Should().Contain("Invalid email or password");
    }

    [Fact]
    public async Task GetCurrentUser_WhenAnonymous_ShouldReturnUnauthorized()
    {
        _client.DefaultRequestHeaders.Authorization = null;
        var response = await _client.GetAsync("/api/auth/me");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetCurrentUser_WithInvalidOrTamperedToken_ShouldReturnUnauthorized()
    {
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", "invalid.tampered.jwttokenstring");
        var response = await _client.GetAsync("/api/auth/me");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetCurrentUser_WithValidJwt_ShouldReturnCurrentUserInfo()
    {
        var email = $"me_{Guid.NewGuid():N}@test.lk";
        var password = "SecurePassword123!";

        await _client.PostAsJsonAsync("/api/auth/register", new RegisterRequestDto
        {
            Email = email,
            Password = password,
            FullName = "Nimal Fernando",
            Role = UserRole.ServiceProvider
        });

        var loginRes = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequestDto
        {
            Email = email,
            Password = password
        });

        var loginPayload = await loginRes.Content.ReadFromJsonAsync<ApiResponse<LoginResponseDto>>(_jsonOptions);
        var token = loginPayload!.Data!.Token;

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var meRes = await _client.GetAsync("/api/auth/me");

        meRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var mePayload = await meRes.Content.ReadFromJsonAsync<ApiResponse<UserProfileDto>>(_jsonOptions);
        mePayload.Should().NotBeNull();
        mePayload!.Data!.Email.Should().Be(email.ToLowerInvariant());
        mePayload.Data.FullName.Should().Be("Nimal Fernando");
        mePayload.Data.Role.Should().Be(UserRole.ServiceProvider);
    }

    [Fact]
    public async Task RoleAuthorization_OwnerCannotAccessManagerOnlyEndpoints_ShouldReturnForbidden()
    {
        // 1. Register Owner
        var ownerEmail = $"owner_role_{Guid.NewGuid():N}@test.lk";
        await _client.PostAsJsonAsync("/api/auth/register", new RegisterRequestDto
        {
            Email = ownerEmail,
            Password = "Password123!",
            FullName = "Owner Person",
            Role = UserRole.Owner
        });

        var ownerLogin = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequestDto
        {
            Email = ownerEmail,
            Password = "Password123!"
        });
        var ownerToken = (await ownerLogin.Content.ReadFromJsonAsync<ApiResponse<LoginResponseDto>>(_jsonOptions))!.Data!.Token;

        // 2. Owner attempts to call Manager-only endpoint (e.g. updating Representative verification status)
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", ownerToken);
        var forbiddenRes = await _client.PatchAsJsonAsync($"/api/representatives/{Guid.NewGuid()}/verification", new
        {
            Status = "Verified"
        });

        forbiddenRes.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }
}
