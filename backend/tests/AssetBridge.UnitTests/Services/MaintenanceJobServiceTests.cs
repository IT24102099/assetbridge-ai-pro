using AssetBridge.Application.Common.Interfaces;
using AssetBridge.Application.DTOs.Maintenance;
using AssetBridge.Application.Services.Implementations;
using AssetBridge.Domain.Entities.Assets;
using AssetBridge.Domain.Entities.Incidents;
using AssetBridge.Domain.Entities.Maintenance;
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

public class MaintenanceJobServiceTests : IDisposable
{
    private readonly AssetBridgeDbContext _dbContext;
    private readonly Mock<ICurrentUserService> _currentUserServiceMock;
    private readonly MaintenanceJobService _jobSut;

    private readonly Guid _ownerUserId = Guid.NewGuid();
    private readonly Guid _providerUserId = Guid.NewGuid();
    private readonly Guid _managerUserId = Guid.NewGuid();

    private readonly Guid _assetId = Guid.NewGuid();
    private readonly Guid _incidentId = Guid.NewGuid();
    private readonly Guid _providerId = Guid.NewGuid();

    public MaintenanceJobServiceTests()
    {
        var dbOptions = new DbContextOptionsBuilder<AssetBridgeDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _dbContext = new AssetBridgeDbContext(dbOptions);
        _currentUserServiceMock = new Mock<ICurrentUserService>();

        _jobSut = new MaintenanceJobService(
            _dbContext,
            _currentUserServiceMock.Object,
            new Mock<ILogger<MaintenanceJobService>>().Object);

        SeedTestData();
    }

    private void SeedTestData()
    {
        _dbContext.Users.AddRange(
            new User { Id = _ownerUserId, FullName = "Owner User", Email = "owner@test.lk", Role = UserRole.Owner },
            new User { Id = _providerUserId, FullName = "Provider User", Email = "pro@test.lk", Role = UserRole.ServiceProvider },
            new User { Id = _managerUserId, FullName = "Manager User", Email = "manager@test.lk", Role = UserRole.Manager }
        );

        _dbContext.Assets.Add(new Asset
        {
            Id = _assetId,
            OwnerId = _ownerUserId,
            Name = "Kandy House",
            AddressLine1 = "12 Lake Road",
            City = "Kandy",
            District = "Kandy",
            PropertyType = PropertyType.SingleFamilyHouse
        });

        _dbContext.Incidents.Add(new Incident
        {
            Id = _incidentId,
            AssetId = _assetId,
            ReportedByUserId = _ownerUserId,
            Title = "Roof Leak",
            Description = "Tiles damaged during monsoon rain",
            Category = IncidentCategory.Roofing,
            Priority = IncidentPriority.High,
            EstimatedBudget = 80000
        });

        _dbContext.ServiceProviders.Add(new ServiceProvider
        {
            Id = _providerId,
            UserId = _providerUserId,
            BusinessName = "Lanka Roof Masters",
            ContactPerson = "Sunil",
            PhoneNumber = "0771122334",
            Email = "pro@test.lk",
            PrimaryDistrict = "Kandy",
            City = "Kandy",
            VerificationStatus = VerificationStatus.Verified
        });

        _dbContext.SaveChanges();
    }

    public void Dispose()
    {
        _dbContext.Database.EnsureDeleted();
        _dbContext.Dispose();
    }

    [Fact]
    public async Task CreateJob_WithValidData_ShouldCreatePlannedJob()
    {
        _currentUserServiceMock.Setup(s => s.IsAuthenticated).Returns(true);
        _currentUserServiceMock.Setup(s => s.UserId).Returns(_managerUserId);
        _currentUserServiceMock.Setup(s => s.Role).Returns(UserRole.Manager);

        var request = new CreateMaintenanceJobRequestDto
        {
            IncidentId = _incidentId,
            ProviderId = _providerId,
            Title = "Roof Tile Replacement & Waterproofing",
            Description = "Replace 15 broken ridge tiles and apply sealant membrane",
            ScheduledStartUtc = DateTime.UtcNow.AddDays(2),
            ScheduledEndUtc = DateTime.UtcNow.AddDays(3),
            ApprovedBudget = 45000
        };

        var result = await _jobSut.CreateJobAsync(request);

        result.Should().NotBeNull();
        result.IncidentId.Should().Be(_incidentId);
        result.ProviderId.Should().Be(_providerId);
        result.Status.Should().Be(MaintenanceJobStatus.Planned);
        result.ApprovedBudget.Should().Be(45000);
    }

    [Fact]
    public async Task CreateJob_WithInvalidSchedule_ShouldThrowValidationException()
    {
        _currentUserServiceMock.Setup(s => s.IsAuthenticated).Returns(true);
        _currentUserServiceMock.Setup(s => s.UserId).Returns(_managerUserId);
        _currentUserServiceMock.Setup(s => s.Role).Returns(UserRole.Manager);

        var request = new CreateMaintenanceJobRequestDto
        {
            IncidentId = _incidentId,
            ProviderId = _providerId,
            Title = "Roof Repair",
            Description = "Fix tiles",
            ScheduledStartUtc = DateTime.UtcNow.AddDays(3),
            ScheduledEndUtc = DateTime.UtcNow.AddDays(1), // End before start
            ApprovedBudget = 45000
        };

        await Assert.ThrowsAsync<ValidationException>(() => _jobSut.CreateJobAsync(request));
    }

    [Fact]
    public async Task UpdateJobStatus_ToCompleted_ShouldSetCompletedAtUtcAndActualCost()
    {
        var job = new MaintenanceJob
        {
            Id = Guid.NewGuid(),
            IncidentId = _incidentId,
            ProviderId = _providerId,
            Title = "Roof Repair",
            Description = "Repair tiles",
            ScheduledStartUtc = DateTime.UtcNow.AddDays(-2),
            ScheduledEndUtc = DateTime.UtcNow.AddDays(-1),
            ApprovedBudget = 45000,
            Status = MaintenanceJobStatus.InProgress
        };
        _dbContext.MaintenanceJobs.Add(job);
        await _dbContext.SaveChangesAsync();

        _currentUserServiceMock.Setup(s => s.IsAuthenticated).Returns(true);
        _currentUserServiceMock.Setup(s => s.UserId).Returns(_providerUserId);
        _currentUserServiceMock.Setup(s => s.Role).Returns(UserRole.ServiceProvider);

        var request = new UpdateMaintenanceJobStatusRequestDto
        {
            Status = MaintenanceJobStatus.Completed,
            ActualCost = 43500,
            CompletionNotes = "All 15 tiles replaced and inspected with water hose test"
        };

        var updated = await _jobSut.UpdateJobStatusAsync(job.Id, request);

        updated.Status.Should().Be(MaintenanceJobStatus.Completed);
        updated.ActualCost.Should().Be(43500);
        updated.CompletedAtUtc.Should().NotBeNull();
        updated.CompletionNotes.Should().Contain("water hose test");
    }
}
