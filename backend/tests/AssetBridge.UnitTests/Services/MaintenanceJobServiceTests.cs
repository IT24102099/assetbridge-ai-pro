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

    [Fact]
    public async Task CreateJobAsync_ShouldThrowEntityNotFoundException_WhenIncidentNotFound()
    {
        // Arrange
        _currentUserServiceMock.Setup(s => s.IsAuthenticated).Returns(true);
        _currentUserServiceMock.Setup(s => s.UserId).Returns(_managerUserId);
        _currentUserServiceMock.Setup(s => s.Role).Returns(UserRole.Manager);

        var nonExistentIncidentId = Guid.NewGuid();
        var request = new CreateMaintenanceJobRequestDto
        {
            IncidentId = nonExistentIncidentId,
            ProviderId = _providerId,
            Title = "Roof Repair",
            Description = "Repair tiles",
            ScheduledStartUtc = DateTime.UtcNow.AddDays(1),
            ScheduledEndUtc = DateTime.UtcNow.AddDays(2),
            ApprovedBudget = 50000
        };

        // Act
        Func<Task> act = async () => await _jobSut.CreateJobAsync(request);

        // Assert
        await act.Should().ThrowAsync<EntityNotFoundException>();
    }

    [Fact]
    public async Task CreateJobAsync_ShouldThrowEntityNotFoundException_WhenProviderNotFound()
    {
        // Arrange
        _currentUserServiceMock.Setup(s => s.IsAuthenticated).Returns(true);
        _currentUserServiceMock.Setup(s => s.UserId).Returns(_managerUserId);
        _currentUserServiceMock.Setup(s => s.Role).Returns(UserRole.Manager);

        var nonExistentProviderId = Guid.NewGuid();
        var request = new CreateMaintenanceJobRequestDto
        {
            IncidentId = _incidentId,
            ProviderId = nonExistentProviderId,
            Title = "Roof Repair",
            Description = "Repair tiles",
            ScheduledStartUtc = DateTime.UtcNow.AddDays(1),
            ScheduledEndUtc = DateTime.UtcNow.AddDays(2),
            ApprovedBudget = 50000
        };

        // Act
        Func<Task> act = async () => await _jobSut.CreateJobAsync(request);

        // Assert
        await act.Should().ThrowAsync<EntityNotFoundException>();
    }

    [Fact]
    public async Task CreateJobAsync_ShouldThrowValidationException_WhenBudgetIsNegative()
    {
        // Arrange
        _currentUserServiceMock.Setup(s => s.IsAuthenticated).Returns(true);
        _currentUserServiceMock.Setup(s => s.UserId).Returns(_managerUserId);
        _currentUserServiceMock.Setup(s => s.Role).Returns(UserRole.Manager);

        var request = new CreateMaintenanceJobRequestDto
        {
            IncidentId = _incidentId,
            ProviderId = _providerId,
            Title = "Roof Repair",
            Description = "Repair tiles",
            ScheduledStartUtc = DateTime.UtcNow.AddDays(1),
            ScheduledEndUtc = DateTime.UtcNow.AddDays(2),
            ApprovedBudget = -500
        };

        // Act
        Func<Task> act = async () => await _jobSut.CreateJobAsync(request);

        // Assert
        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task GetJobByIdAsync_ShouldThrowEntityNotFoundException_WhenJobNotFound()
    {
        // Arrange
        var nonExistentJobId = Guid.NewGuid();

        // Act
        Func<Task> act = async () => await _jobSut.GetJobByIdAsync(nonExistentJobId);

        // Assert
        await act.Should().ThrowAsync<EntityNotFoundException>();
    }

    [Fact]
    public async Task GetJobByIdAsync_ShouldThrowUnauthorizedAccessException_WhenOtherOwnerAccesses()
    {
        // Arrange
        var otherOwnerId = Guid.NewGuid();
        _dbContext.Users.Add(new User { Id = otherOwnerId, FullName = "Other Owner", Email = "otherowner@test.lk", Role = UserRole.Owner });

        var job = new MaintenanceJob
        {
            Id = Guid.NewGuid(),
            IncidentId = _incidentId,
            ProviderId = _providerId,
            Title = "Private Owner Job",
            Description = "Private repair",
            ScheduledStartUtc = DateTime.UtcNow.AddDays(1),
            ScheduledEndUtc = DateTime.UtcNow.AddDays(2),
            ApprovedBudget = 10000,
            Status = MaintenanceJobStatus.Planned
        };
        _dbContext.MaintenanceJobs.Add(job);
        await _dbContext.SaveChangesAsync();

        _currentUserServiceMock.Setup(s => s.IsAuthenticated).Returns(true);
        _currentUserServiceMock.Setup(s => s.UserId).Returns(otherOwnerId);
        _currentUserServiceMock.Setup(s => s.Role).Returns(UserRole.Owner);

        // Act
        Func<Task> act = async () => await _jobSut.GetJobByIdAsync(job.Id);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task GetJobsAsync_ShouldFilterByIncidentProviderAndStatus()
    {
        // Arrange
        _currentUserServiceMock.Setup(s => s.IsAuthenticated).Returns(true);
        _currentUserServiceMock.Setup(s => s.UserId).Returns(_managerUserId);
        _currentUserServiceMock.Setup(s => s.Role).Returns(UserRole.Manager);

        _dbContext.MaintenanceJobs.AddRange(
            new MaintenanceJob { Id = Guid.NewGuid(), IncidentId = _incidentId, ProviderId = _providerId, Title = "Job 1", Description = "Desc 1", ScheduledStartUtc = DateTime.UtcNow.AddDays(1), ScheduledEndUtc = DateTime.UtcNow.AddDays(2), ApprovedBudget = 10000, Status = MaintenanceJobStatus.Planned, CreatedAtUtc = DateTime.UtcNow.AddDays(-2) },
            new MaintenanceJob { Id = Guid.NewGuid(), IncidentId = _incidentId, ProviderId = _providerId, Title = "Job 2", Description = "Desc 2", ScheduledStartUtc = DateTime.UtcNow.AddDays(3), ScheduledEndUtc = DateTime.UtcNow.AddDays(4), ApprovedBudget = 20000, Status = MaintenanceJobStatus.InProgress, CreatedAtUtc = DateTime.UtcNow.AddDays(-1) }
        );
        await _dbContext.SaveChangesAsync();

        var query = new MaintenanceJobQueryParametersDto
        {
            IncidentId = _incidentId,
            ProviderId = _providerId,
            Status = MaintenanceJobStatus.Planned,
            SortBy = "approvedbudget",
            SortDescending = false,
            PageNumber = 1,
            PageSize = 10
        };

        // Act
        var result = await _jobSut.GetJobsAsync(query);

        // Assert
        result.Should().NotBeNull();
        result.TotalCount.Should().Be(1);
        result.Items.First().Title.Should().Be("Job 1");
    }

    [Fact]
    public async Task UpdateJobStatusAsync_ShouldThrowValidationException_WhenActualCostIsNegative()
    {
        // Arrange
        var job = new MaintenanceJob
        {
            Id = Guid.NewGuid(),
            IncidentId = _incidentId,
            ProviderId = _providerId,
            Title = "Status Validation Job",
            Description = "Job for testing",
            ScheduledStartUtc = DateTime.UtcNow.AddDays(-2),
            ScheduledEndUtc = DateTime.UtcNow.AddDays(-1),
            ApprovedBudget = 20000,
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
            ActualCost = -500
        };

        // Act
        Func<Task> act = async () => await _jobSut.UpdateJobStatusAsync(job.Id, request);

        // Assert
        await act.Should().ThrowAsync<ValidationException>();
    }
}
