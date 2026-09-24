using AssetBridge.Application.DTOs.Providers;
using AssetBridge.Application.Services.Implementations;
using AssetBridge.Domain.Entities.Assets;
using AssetBridge.Domain.Entities.Incidents;
using AssetBridge.Domain.Entities.Providers;
using AssetBridge.Domain.Entities.Users;
using AssetBridge.Domain.Enums;
using AssetBridge.Infrastructure.Persistence;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace AssetBridge.UnitTests.Services;

public class ProviderMatchingServiceTests : IDisposable
{
    private readonly AssetBridgeDbContext _dbContext;
    private readonly LocationService _locationService;
    private readonly ProviderMatchingService _sut;

    public ProviderMatchingServiceTests()
    {
        var dbOptions = new DbContextOptionsBuilder<AssetBridgeDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _dbContext = new AssetBridgeDbContext(dbOptions);
        _locationService = new LocationService();

        _sut = new ProviderMatchingService(
            _dbContext,
            _locationService,
            new Mock<ILogger<ProviderMatchingService>>().Object);
    }

    public void Dispose()
    {
        _dbContext.Database.EnsureDeleted();
        _dbContext.Dispose();
    }

    [Fact]
    public async Task MatchProviders_ShouldExcludeUnverifiedProviders()
    {
        // Arrange: Verified plumber vs Unverified plumber
        var verifiedProvider = new ServiceProvider
        {
            Id = Guid.NewGuid(),
            UserId = Guid.NewGuid(),
            BusinessName = "Verified Plumber",
            ContactPerson = "Sunil",
            PhoneNumber = "0771111111",
            Email = "v@plumber.lk",
            PrimaryDistrict = "Kandy",
            City = "Kandy",
            VerificationStatus = VerificationStatus.Verified,
            IsActive = true,
            Rating = 4.8,
            CompletedJobsCount = 5,
            Skills = new List<ProviderSkill>
            {
                new() { Id = Guid.NewGuid(), Category = IncidentCategory.Plumbing, SkillName = "Pipe Repair", YearsOfExperience = 5 }
            }
        };

        var unverifiedProvider = new ServiceProvider
        {
            Id = Guid.NewGuid(),
            UserId = Guid.NewGuid(),
            BusinessName = "Unverified Plumber",
            ContactPerson = "Nimal",
            PhoneNumber = "0772222222",
            Email = "u@plumber.lk",
            PrimaryDistrict = "Kandy",
            City = "Kandy",
            VerificationStatus = VerificationStatus.Pending,
            IsActive = true,
            Skills = new List<ProviderSkill>
            {
                new() { Id = Guid.NewGuid(), Category = IncidentCategory.Plumbing, SkillName = "Pipe Repair", YearsOfExperience = 8 }
            }
        };

        _dbContext.ServiceProviders.AddRange(verifiedProvider, unverifiedProvider);
        await _dbContext.SaveChangesAsync();

        var request = new ProviderMatchingRequestDto
        {
            Category = IncidentCategory.Plumbing,
            District = "Kandy",
            City = "Kandy"
        };

        // Act
        var result = await _sut.MatchProvidersAsync(request);

        // Assert
        result.Candidates.Should().HaveCount(1);
        result.Candidates.First().ProviderId.Should().Be(verifiedProvider.Id);
        result.Candidates.First().BusinessName.Should().Be("Verified Plumber");
        result.Candidates.First().ExplanationReasons.Should().Contain(r => r.Contains("Verified"));
    }

    [Fact]
    public async Task MatchProviders_WithCoordinates_ShouldRankCloserProviderHigher()
    {
        // Property in Kandy Lake area: (7.2906, 80.6337)
        // Provider Close: 2 km away in Kandy City (7.2930, 80.6400)
        // Provider Far: 18 km away in Gampola (7.1644, 80.5764)
        var targetDate = DateTime.UtcNow.AddDays(3).Date;

        var closeProvider = new ServiceProvider
        {
            Id = Guid.NewGuid(),
            UserId = Guid.NewGuid(),
            BusinessName = "Kandy Central Plumber",
            ContactPerson = "Saman",
            PhoneNumber = "0773333333",
            Email = "close@plumber.lk",
            PrimaryDistrict = "Kandy",
            City = "Kandy",
            BaseLatitude = 7.2930,
            BaseLongitude = 80.6400,
            ServiceRadiusKm = 20.0,
            VerificationStatus = VerificationStatus.Verified,
            IsActive = true,
            Rating = 4.5,
            CompletedJobsCount = 10,
            Skills = new List<ProviderSkill>
            {
                new() { Id = Guid.NewGuid(), Category = IncidentCategory.Plumbing, SkillName = "Plumbing Specialist", YearsOfExperience = 6, IsPrimary = true }
            },
            AvailabilitySlots = new List<ProviderAvailability>
            {
                new() { Id = Guid.NewGuid(), AvailableDateUtc = targetDate, StartTime = TimeSpan.FromHours(8), EndTime = TimeSpan.FromHours(17), Status = AvailabilityStatus.Available }
            }
        };

        var farProvider = new ServiceProvider
        {
            Id = Guid.NewGuid(),
            UserId = Guid.NewGuid(),
            BusinessName = "Gampola Plumber",
            ContactPerson = "Ruwan",
            PhoneNumber = "0774444444",
            Email = "far@plumber.lk",
            PrimaryDistrict = "Kandy",
            City = "Gampola",
            BaseLatitude = 7.1644,
            BaseLongitude = 80.5764,
            ServiceRadiusKm = 25.0,
            VerificationStatus = VerificationStatus.Verified,
            IsActive = true,
            Rating = 4.5,
            CompletedJobsCount = 10,
            Skills = new List<ProviderSkill>
            {
                new() { Id = Guid.NewGuid(), Category = IncidentCategory.Plumbing, SkillName = "Plumbing Specialist", YearsOfExperience = 6, IsPrimary = true }
            },
            AvailabilitySlots = new List<ProviderAvailability>
            {
                new() { Id = Guid.NewGuid(), AvailableDateUtc = targetDate, StartTime = TimeSpan.FromHours(8), EndTime = TimeSpan.FromHours(17), Status = AvailabilityStatus.Available }
            }
        };

        _dbContext.ServiceProviders.AddRange(closeProvider, farProvider);
        await _dbContext.SaveChangesAsync();

        var request = new ProviderMatchingRequestDto
        {
            Category = IncidentCategory.Plumbing,
            District = "Kandy",
            City = "Kandy",
            TargetLatitude = 7.2906,
            TargetLongitude = 80.6337,
            RequiredDateUtc = targetDate
        };

        // Act
        var result = await _sut.MatchProvidersAsync(request);

        // Assert
        result.Candidates.Should().HaveCount(2);
        result.Candidates[0].ProviderId.Should().Be(closeProvider.Id);
        result.Candidates[0].MatchScore.Should().BeGreaterThan(result.Candidates[1].MatchScore);
        result.Candidates[0].DistanceKm.Should().BeLessThan(result.Candidates[1].DistanceKm!.Value);
        result.Candidates[0].ExplanationReasons.Should().Contain(r => r.Contains("km from property"));
    }

    [Fact]
    public async Task MatchProviders_WhenAvailabilityDiffers_ShouldRankAvailableProviderHigher()
    {
        var targetDate = DateTime.UtcNow.AddDays(2).Date;

        var availableProvider = new ServiceProvider
        {
            Id = Guid.NewGuid(),
            UserId = Guid.NewGuid(),
            BusinessName = "Available Contractor",
            ContactPerson = "Kasun",
            PhoneNumber = "0775555555",
            Email = "avail@test.lk",
            PrimaryDistrict = "Colombo",
            City = "Colombo",
            VerificationStatus = VerificationStatus.Verified,
            IsActive = true,
            Skills = new List<ProviderSkill>
            {
                new() { Id = Guid.NewGuid(), Category = IncidentCategory.Electrical, SkillName = "Wiring", YearsOfExperience = 4 }
            },
            AvailabilitySlots = new List<ProviderAvailability>
            {
                new() { Id = Guid.NewGuid(), AvailableDateUtc = targetDate, StartTime = TimeSpan.FromHours(9), EndTime = TimeSpan.FromHours(17), Status = AvailabilityStatus.Available }
            }
        };

        var busyProvider = new ServiceProvider
        {
            Id = Guid.NewGuid(),
            UserId = Guid.NewGuid(),
            BusinessName = "Busy Contractor",
            ContactPerson = "Dinesh",
            PhoneNumber = "0776666666",
            Email = "busy@test.lk",
            PrimaryDistrict = "Colombo",
            City = "Colombo",
            VerificationStatus = VerificationStatus.Verified,
            IsActive = true,
            Skills = new List<ProviderSkill>
            {
                new() { Id = Guid.NewGuid(), Category = IncidentCategory.Electrical, SkillName = "Wiring", YearsOfExperience = 4 }
            },
            AvailabilitySlots = new List<ProviderAvailability>
            {
                new() { Id = Guid.NewGuid(), AvailableDateUtc = targetDate, StartTime = TimeSpan.FromHours(9), EndTime = TimeSpan.FromHours(17), Status = AvailabilityStatus.Busy }
            }
        };

        _dbContext.ServiceProviders.AddRange(availableProvider, busyProvider);
        await _dbContext.SaveChangesAsync();

        var request = new ProviderMatchingRequestDto
        {
            Category = IncidentCategory.Electrical,
            District = "Colombo",
            RequiredDateUtc = targetDate
        };

        // Act
        var result = await _sut.MatchProvidersAsync(request);

        // Assert
        result.Candidates.Should().HaveCount(2);
        result.Candidates[0].ProviderId.Should().Be(availableProvider.Id);
        result.Candidates[0].IsAvailableOnRequiredDate.Should().BeTrue();
        result.Candidates[1].IsAvailableOnRequiredDate.Should().BeFalse();
        result.Candidates[0].MatchScore.Should().BeGreaterThan(result.Candidates[1].MatchScore);
    }
}
