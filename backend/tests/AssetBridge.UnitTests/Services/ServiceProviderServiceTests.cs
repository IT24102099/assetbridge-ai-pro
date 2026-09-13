using AssetBridge.Application.Common.Interfaces;
using AssetBridge.Application.DTOs.Providers;
using AssetBridge.Application.DTOs.Representatives;
using AssetBridge.Application.Services.Implementations;
using AssetBridge.Domain.Entities.Providers;
using AssetBridge.Domain.Entities.Users;
using AssetBridge.Domain.Enums;
using AssetBridge.Domain.Exceptions;
using AssetBridge.Infrastructure.Persistence;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace AssetBridge.UnitTests.Services;

public class ServiceProviderServiceTests : IDisposable
{
    private readonly AssetBridgeDbContext _dbContext;
    private readonly Mock<ICurrentUserService> _currentUserServiceMock;
    private readonly ServiceProviderService _providerSut;
    private readonly ProviderSkillService _skillSut;
    private readonly ProviderAvailabilityService _availabilitySut;
    private readonly ProviderHistoryService _historySut;

    private readonly Guid _providerUser1Id = Guid.NewGuid();
    private readonly Guid _providerUser2Id = Guid.NewGuid();
    private readonly Guid _managerUserId = Guid.NewGuid();

    public ServiceProviderServiceTests()
    {
        var dbOptions = new DbContextOptionsBuilder<AssetBridgeDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _dbContext = new AssetBridgeDbContext(dbOptions);
        _currentUserServiceMock = new Mock<ICurrentUserService>();

        _providerSut = new ServiceProviderService(
            _dbContext,
            _currentUserServiceMock.Object,
            new Mock<ILogger<ServiceProviderService>>().Object);

        _skillSut = new ProviderSkillService(
            _dbContext,
            _currentUserServiceMock.Object,
            new Mock<ILogger<ProviderSkillService>>().Object);

        _availabilitySut = new ProviderAvailabilityService(
            _dbContext,
            _currentUserServiceMock.Object,
            new Mock<ILogger<ProviderAvailabilityService>>().Object);

        _historySut = new ProviderHistoryService(
            _dbContext,
            _currentUserServiceMock.Object,
            new Mock<ILogger<ProviderHistoryService>>().Object);

        SeedTestUsers();
    }

    private void SeedTestUsers()
    {
        _dbContext.Users.AddRange(
            new User { Id = _providerUser1Id, FullName = "Plumber Perera", Email = "perera@plumbing.lk", Role = UserRole.ServiceProvider },
            new User { Id = _providerUser2Id, FullName = "Electrician Silva", Email = "silva@spark.lk", Role = UserRole.ServiceProvider },
            new User { Id = _managerUserId, FullName = "Ops Manager", Email = "manager@assetbridge.ai", Role = UserRole.Manager }
        );
        _dbContext.SaveChanges();
    }

    public void Dispose()
    {
        _dbContext.Database.EnsureDeleted();
        _dbContext.Dispose();
    }

    [Fact]
    public async Task CreateServiceProvider_WithValidData_ShouldCreatePendingProvider()
    {
        // Arrange
        _currentUserServiceMock.Setup(s => s.IsAuthenticated).Returns(true);
        _currentUserServiceMock.Setup(s => s.UserId).Returns(_providerUser1Id);
        _currentUserServiceMock.Setup(s => s.Role).Returns(UserRole.ServiceProvider);

        var request = new CreateServiceProviderRequestDto
        {
            BusinessName = "Perera Plumbing Services",
            ContactPerson = "Sunil Perera",
            PhoneNumber = "+94771239876",
            Email = "perera@plumbing.lk",
            PrimaryDistrict = "Kandy",
            City = "Kandy",
            BaseLatitude = 7.2906,
            BaseLongitude = 80.6337,
            ServiceRadiusKm = 25.0
        };

        // Act
        var result = await _providerSut.CreateServiceProviderAsync(request);

        // Assert
        result.Should().NotBeNull();
        result.BusinessName.Should().Be("Perera Plumbing Services");
        result.VerificationStatus.Should().Be(VerificationStatus.Pending);
        result.Rating.Should().Be(5.0);
        result.CompletedJobsCount.Should().Be(0);
    }

    [Fact]
    public async Task AddSkill_ValidSkill_ShouldAddToProvider()
    {
        // Arrange
        var provider = new ServiceProvider
        {
            Id = Guid.NewGuid(),
            UserId = _providerUser1Id,
            BusinessName = "Perera Plumbing",
            ContactPerson = "Sunil",
            PhoneNumber = "0771234567",
            Email = "perera@plumbing.lk",
            PrimaryDistrict = "Kandy",
            City = "Kandy"
        };
        _dbContext.ServiceProviders.Add(provider);
        await _dbContext.SaveChangesAsync();

        _currentUserServiceMock.Setup(s => s.IsAuthenticated).Returns(true);
        _currentUserServiceMock.Setup(s => s.UserId).Returns(_providerUser1Id);
        _currentUserServiceMock.Setup(s => s.Role).Returns(UserRole.ServiceProvider);

        var skillRequest = new AddProviderSkillRequestDto
        {
            Category = IncidentCategory.Plumbing,
            SkillName = "Pipe & Leak Repair",
            YearsOfExperience = 8,
            IsPrimary = true
        };

        // Act
        var skill = await _skillSut.AddSkillAsync(provider.Id, skillRequest);

        // Assert
        skill.Should().NotBeNull();
        skill.Category.Should().Be(IncidentCategory.Plumbing);
        skill.SkillName.Should().Be("Pipe & Leak Repair");
        skill.IsPrimary.Should().BeTrue();
    }

    [Fact]
    public async Task AddSkill_DuplicateInSameCategory_ShouldThrowValidationException()
    {
        // Arrange
        var provider = new ServiceProvider
        {
            Id = Guid.NewGuid(),
            UserId = _providerUser1Id,
            BusinessName = "Perera Plumbing",
            ContactPerson = "Sunil",
            PhoneNumber = "0771234567",
            Email = "perera@plumbing.lk",
            PrimaryDistrict = "Kandy",
            City = "Kandy"
        };
        _dbContext.ServiceProviders.Add(provider);
        await _dbContext.SaveChangesAsync();

        _currentUserServiceMock.Setup(s => s.IsAuthenticated).Returns(true);
        _currentUserServiceMock.Setup(s => s.UserId).Returns(_providerUser1Id);
        _currentUserServiceMock.Setup(s => s.Role).Returns(UserRole.ServiceProvider);

        var skillRequest = new AddProviderSkillRequestDto
        {
            Category = IncidentCategory.Plumbing,
            SkillName = "Pipe & Leak Repair",
            YearsOfExperience = 8
        };

        await _skillSut.AddSkillAsync(provider.Id, skillRequest);

        // Act & Assert
        await Assert.ThrowsAsync<ValidationException>(() => _skillSut.AddSkillAsync(provider.Id, skillRequest));
    }

    [Fact]
    public async Task AddAvailability_InvalidTimeRange_ShouldThrowValidationException()
    {
        // Arrange
        var provider = new ServiceProvider
        {
            Id = Guid.NewGuid(),
            UserId = _providerUser1Id,
            BusinessName = "Perera Plumbing",
            ContactPerson = "Sunil",
            PhoneNumber = "0771234567",
            Email = "perera@plumbing.lk",
            PrimaryDistrict = "Kandy",
            City = "Kandy"
        };
        _dbContext.ServiceProviders.Add(provider);
        await _dbContext.SaveChangesAsync();

        _currentUserServiceMock.Setup(s => s.IsAuthenticated).Returns(true);
        _currentUserServiceMock.Setup(s => s.UserId).Returns(_providerUser1Id);
        _currentUserServiceMock.Setup(s => s.Role).Returns(UserRole.ServiceProvider);

        var request = new AddProviderAvailabilityRequestDto
        {
            AvailableDateUtc = DateTime.UtcNow.AddDays(2).Date,
            StartTime = TimeSpan.FromHours(17),
            EndTime = TimeSpan.FromHours(9) // End earlier than start
        };

        // Act & Assert
        await Assert.ThrowsAsync<ValidationException>(() => _availabilitySut.AddAvailabilityAsync(provider.Id, request));
    }

    [Fact]
    public async Task AddHistoryEntry_JobCompleted_ShouldIncrementCompletedJobsAndRecalculateRating()
    {
        // Arrange
        var provider = new ServiceProvider
        {
            Id = Guid.NewGuid(),
            UserId = _providerUser1Id,
            BusinessName = "Perera Plumbing",
            ContactPerson = "Sunil",
            PhoneNumber = "0771234567",
            Email = "perera@plumbing.lk",
            PrimaryDistrict = "Kandy",
            City = "Kandy",
            CompletedJobsCount = 2,
            Rating = 5.0
        };
        _dbContext.ServiceProviders.Add(provider);
        await _dbContext.SaveChangesAsync();

        _currentUserServiceMock.Setup(s => s.IsAuthenticated).Returns(true);
        _currentUserServiceMock.Setup(s => s.UserId).Returns(_managerUserId);
        _currentUserServiceMock.Setup(s => s.Role).Returns(UserRole.Manager);

        var historyRequest = new AddProviderHistoryRequestDto
        {
            EventType = ProviderHistoryType.JobCompleted,
            Title = "Fixed Main Pipe Leak",
            Description = "Completed emergency pipe replacement cleanly in 2 hours.",
            RatingScore = 4.0
        };

        // Act
        var history = await _historySut.AddHistoryEntryAsync(provider.Id, historyRequest);

        // Assert
        history.Should().NotBeNull();
        var updatedProvider = await _dbContext.ServiceProviders.FindAsync(provider.Id);
        updatedProvider!.CompletedJobsCount.Should().Be(3);
        updatedProvider.Rating.Should().Be(4.0);
    }
}
