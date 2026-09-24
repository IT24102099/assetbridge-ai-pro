using AssetBridge.Application.Common.Interfaces;
using AssetBridge.Application.DTOs.Incidents;
using AssetBridge.Application.Services.Implementations;
using AssetBridge.Application.Services.Interfaces;
using AssetBridge.Domain.Entities.Assets;
using AssetBridge.Domain.Entities.Incidents;
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

public class IncidentServiceTests : IDisposable
{
    private readonly AssetBridgeDbContext _dbContext;
    private readonly Mock<ICurrentUserService> _currentUserServiceMock;
    private readonly Mock<IAssetHistoryService> _historyServiceMock;
    private readonly Mock<ILogger<IncidentService>> _loggerMock;
    private readonly IncidentService _sut;

    private readonly Guid _owner1Id = Guid.NewGuid();
    private readonly Guid _owner2Id = Guid.NewGuid();
    private readonly Guid _asset1Id = Guid.NewGuid();
    private readonly Guid _archivedAssetId = Guid.NewGuid();

    public IncidentServiceTests()
    {
        var dbOptions = new DbContextOptionsBuilder<AssetBridgeDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _dbContext = new AssetBridgeDbContext(dbOptions);
        _currentUserServiceMock = new Mock<ICurrentUserService>();
        _historyServiceMock = new Mock<IAssetHistoryService>();
        _loggerMock = new Mock<ILogger<IncidentService>>();

        _sut = new IncidentService(
            _dbContext,
            _currentUserServiceMock.Object,
            _historyServiceMock.Object,
            _loggerMock.Object);

        SeedTestData();
    }

    private void SeedTestData()
    {
        var owner1 = new User { Id = _owner1Id, FullName = "Moosika Owner", Email = "owner1@assetbridge.ai", Role = UserRole.Owner };
        var owner2 = new User { Id = _owner2Id, FullName = "Other Owner", Email = "owner2@assetbridge.ai", Role = UserRole.Owner };

        var asset1 = new Asset
        {
            Id = _asset1Id,
            OwnerId = _owner1Id,
            Name = "Kandy House",
            City = "Kandy",
            District = "Kandy",
            AddressLine1 = "10 Temple Rd",
            Status = AssetStatus.Active
        };

        var archivedAsset = new Asset
        {
            Id = _archivedAssetId,
            OwnerId = _owner1Id,
            Name = "Archived Property",
            City = "Colombo",
            District = "Colombo",
            AddressLine1 = "5 Old Rd",
            Status = AssetStatus.Archived
        };

        _dbContext.Users.AddRange(owner1, owner2);
        _dbContext.Assets.AddRange(asset1, archivedAsset);
        _dbContext.SaveChanges();
    }

    public void Dispose()
    {
        _dbContext.Database.EnsureDeleted();
        _dbContext.Dispose();
    }

    [Fact]
    public async Task CreateIncidentAsync_ShouldCreateIncidentAndRecordHistory_WhenValid()
    {
        // Arrange
        _currentUserServiceMock.Setup(x => x.IsAuthenticated).Returns(true);
        _currentUserServiceMock.Setup(x => x.UserId).Returns(_owner1Id);
        _currentUserServiceMock.Setup(x => x.Role).Returns(UserRole.Owner);

        var request = new CreateIncidentRequestDto
        {
            AssetId = _asset1Id,
            Title = "Kitchen Pipe Burst",
            Description = "Major water leak under the kitchen sink flooding the floor.",
            Category = IncidentCategory.Plumbing,
            Priority = IncidentPriority.High,
            EstimatedBudget = 75000,
            LocationDetails = "Kitchen main sink"
        };

        // Act
        var result = await _sut.CreateIncidentAsync(request);

        // Assert
        result.Should().NotBeNull();
        result.Title.Should().Be("Kitchen Pipe Burst");
        result.Category.Should().Be(IncidentCategory.Plumbing);
        result.Priority.Should().Be(IncidentPriority.High);
        result.Status.Should().Be(IncidentStatus.Reported);
        result.EstimatedBudget.Should().Be(75000);

        _historyServiceMock.Verify(x => x.RecordEventAsync(
            _asset1Id,
            AssetHistoryEventType.IncidentReported,
            It.IsAny<string>(),
            It.IsAny<string>(),
            _owner1Id,
            result.Id,
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CreateIncidentAsync_ShouldThrowValidationException_WhenBudgetIsNegative()
    {
        // Arrange
        _currentUserServiceMock.Setup(x => x.IsAuthenticated).Returns(true);
        _currentUserServiceMock.Setup(x => x.UserId).Returns(_owner1Id);
        _currentUserServiceMock.Setup(x => x.Role).Returns(UserRole.Owner);

        var request = new CreateIncidentRequestDto
        {
            AssetId = _asset1Id,
            Title = "Invalid Budget Test",
            Description = "This incident has a negative budget.",
            Category = IncidentCategory.General,
            Priority = IncidentPriority.Low,
            EstimatedBudget = -5000
        };

        // Act
        var act = () => _sut.CreateIncidentAsync(request);

        // Assert
        await act.Should().ThrowAsync<ValidationException>()
            .WithMessage("*negative*");
    }

    [Fact]
    public async Task CreateIncidentAsync_ShouldThrowDomainException_WhenAssetIsArchived()
    {
        // Arrange
        _currentUserServiceMock.Setup(x => x.IsAuthenticated).Returns(true);
        _currentUserServiceMock.Setup(x => x.UserId).Returns(_owner1Id);
        _currentUserServiceMock.Setup(x => x.Role).Returns(UserRole.Owner);

        var request = new CreateIncidentRequestDto
        {
            AssetId = _archivedAssetId,
            Title = "Leak in Archived Asset",
            Description = "Attempting to create incident on archived asset.",
            Category = IncidentCategory.Plumbing,
            Priority = IncidentPriority.Medium
        };

        // Act
        var act = () => _sut.CreateIncidentAsync(request);

        // Assert
        await act.Should().ThrowAsync<DomainException>()
            .WithMessage("*Cannot report an incident on a property with status 'Archived'*");
    }

    [Fact]
    public async Task CreateIncidentAsync_ShouldThrowUnauthorized_WhenOwnerReportsForAnotherOwnersAsset()
    {
        // Arrange (Caller is Owner 2 trying to create incident for Asset 1 owned by Owner 1)
        _currentUserServiceMock.Setup(x => x.IsAuthenticated).Returns(true);
        _currentUserServiceMock.Setup(x => x.UserId).Returns(_owner2Id);
        _currentUserServiceMock.Setup(x => x.Role).Returns(UserRole.Owner);

        var request = new CreateIncidentRequestDto
        {
            AssetId = _asset1Id,
            Title = "Unauthorized Incident",
            Description = "Trying to report incident for property owned by someone else.",
            Category = IncidentCategory.Electrical,
            Priority = IncidentPriority.Medium
        };

        // Act
        var act = () => _sut.CreateIncidentAsync(request);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("*not have permission*");
    }

    [Fact]
    public async Task UpdateIncidentStatusAsync_ShouldAllowValidTransition_FromReportedToPlanning()
    {
        // Arrange
        _currentUserServiceMock.Setup(x => x.IsAuthenticated).Returns(true);
        _currentUserServiceMock.Setup(x => x.UserId).Returns(_owner1Id);
        _currentUserServiceMock.Setup(x => x.Role).Returns(UserRole.Owner);

        var incident = new Incident
        {
            Id = Guid.NewGuid(),
            AssetId = _asset1Id,
            ReportedByUserId = _owner1Id,
            Title = "Roof Leak",
            Description = "Water leaking from ceiling",
            Status = IncidentStatus.Reported
        };
        _dbContext.Incidents.Add(incident);
        await _dbContext.SaveChangesAsync();

        var request = new UpdateIncidentStatusRequestDto
        {
            Status = IncidentStatus.Planning,
            StatusChangeReason = "Manager approved transition to planning phase"
        };

        // Act
        var result = await _sut.UpdateIncidentStatusAsync(incident.Id, request);

        // Assert
        result.Status.Should().Be(IncidentStatus.Planning);

        _historyServiceMock.Verify(x => x.RecordEventAsync(
            _asset1Id,
            AssetHistoryEventType.IncidentStatusChanged,
            It.IsAny<string>(),
            It.IsAny<string>(),
            _owner1Id,
            incident.Id,
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task UpdateIncidentStatusAsync_ShouldThrowDomainException_OnInvalidTransition_FromResolvedToPlanning()
    {
        // Arrange
        _currentUserServiceMock.Setup(x => x.IsAuthenticated).Returns(true);
        _currentUserServiceMock.Setup(x => x.UserId).Returns(_owner1Id);
        _currentUserServiceMock.Setup(x => x.Role).Returns(UserRole.Owner);

        var incident = new Incident
        {
            Id = Guid.NewGuid(),
            AssetId = _asset1Id,
            ReportedByUserId = _owner1Id,
            Title = "Fixed Leak",
            Description = "Already resolved issue",
            Status = IncidentStatus.Resolved
        };
        _dbContext.Incidents.Add(incident);
        await _dbContext.SaveChangesAsync();

        var request = new UpdateIncidentStatusRequestDto
        {
            Status = IncidentStatus.Planning // Invalid jump from Resolved to Planning
        };

        // Act
        var act = () => _sut.UpdateIncidentStatusAsync(incident.Id, request);

        // Assert
        await act.Should().ThrowAsync<DomainException>()
            .WithMessage("*Invalid status transition from 'Resolved' to 'Planning'*");
    }

    [Fact]
    public async Task AddEvidenceAsync_ShouldAddEvidenceAndRecordHistory()
    {
        // Arrange
        _currentUserServiceMock.Setup(x => x.IsAuthenticated).Returns(true);
        _currentUserServiceMock.Setup(x => x.UserId).Returns(_owner1Id);
        _currentUserServiceMock.Setup(x => x.Role).Returns(UserRole.Owner);

        var incident = new Incident
        {
            Id = Guid.NewGuid(),
            AssetId = _asset1Id,
            ReportedByUserId = _owner1Id,
            Title = "Damaged Wall",
            Description = "Wall crack",
            Status = IncidentStatus.Reported
        };
        _dbContext.Incidents.Add(incident);
        await _dbContext.SaveChangesAsync();

        var request = new AddIncidentEvidenceRequestDto
        {
            FileName = "wall_crack_before.jpg",
            FileUrl = "https://storage.assetbridge.ai/evidence/wall_crack_before.jpg",
            FileType = "image/jpeg",
            FileSizeBytes = 2048500,
            EvidenceType = EvidenceType.Photo,
            Caption = "Visible 2m horizontal crack in kitchen wall"
        };

        // Act
        var result = await _sut.AddEvidenceAsync(incident.Id, request);

        // Assert
        result.Should().NotBeNull();
        result.FileName.Should().Be("wall_crack_before.jpg");
        result.EvidenceType.Should().Be(EvidenceType.Photo);
        result.Caption.Should().Be("Visible 2m horizontal crack in kitchen wall");

        var evidenceInDb = await _dbContext.IncidentEvidence.FirstOrDefaultAsync(e => e.Id == result.Id);
        evidenceInDb.Should().NotBeNull();
        evidenceInDb!.IncidentId.Should().Be(incident.Id);

        _historyServiceMock.Verify(x => x.RecordEventAsync(
            _asset1Id,
            AssetHistoryEventType.EvidenceAdded,
            It.IsAny<string>(),
            It.IsAny<string>(),
            _owner1Id,
            incident.Id,
            It.IsAny<CancellationToken>()), Times.Once);
    }
}
