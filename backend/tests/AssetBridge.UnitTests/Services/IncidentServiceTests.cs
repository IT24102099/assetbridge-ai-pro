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
    private readonly Mock<IFileStorageService> _fileStorageServiceMock;
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
        _fileStorageServiceMock = new Mock<IFileStorageService>();
        _loggerMock = new Mock<ILogger<IncidentService>>();

        _sut = new IncidentService(
            _dbContext,
            _currentUserServiceMock.Object,
            _historyServiceMock.Object,
            _fileStorageServiceMock.Object,
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

    [Fact]
    public async Task UploadEvidenceAsync_ShouldStreamFileToStorage_AndSavePersistentUrlInDatabase()
    {
        // Arrange
        _currentUserServiceMock.Setup(x => x.IsAuthenticated).Returns(true);
        _currentUserServiceMock.Setup(x => x.UserId).Returns(_owner1Id);
        _currentUserServiceMock.Setup(x => x.Role).Returns(UserRole.Owner);

        var expectedCloudinaryUrl = "https://res.cloudinary.com/assetbridge/image/upload/v12345/assetbridge/evidence/evidence_water2.jpg";
        _fileStorageServiceMock
            .Setup(x => x.UploadFileAsync(
                It.IsAny<Stream>(),
                "water2.jpg",
                "image/jpeg",
                "assetbridge/evidence",
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedCloudinaryUrl);

        var incident = new Incident
        {
            Id = Guid.NewGuid(),
            AssetId = _asset1Id,
            ReportedByUserId = _owner1Id,
            Title = "Kitchen Pipe Burst",
            Description = "Water flooding kitchen floor",
            Status = IncidentStatus.Reported
        };
        _dbContext.Incidents.Add(incident);
        await _dbContext.SaveChangesAsync();

        using var memoryStream = new MemoryStream(new byte[] { 0xFF, 0xD8, 0xFF, 0xE0 }); // Valid JPEG magic header bytes

        // Act
        var result = await _sut.UploadEvidenceAsync(
            incident.Id,
            memoryStream,
            "water2.jpg",
            "image/jpeg",
            4,
            EvidenceType.Photo,
            "Real photo of flooded pantry floor");

        // Assert
        result.Should().NotBeNull();
        result.FileUrl.Should().Be(expectedCloudinaryUrl);
        result.FileName.Should().Be("water2.jpg");
        result.EvidenceType.Should().Be(EvidenceType.Photo);
        result.Caption.Should().Be("Real photo of flooded pantry floor");

        var dbRecord = await _dbContext.IncidentEvidence.FirstOrDefaultAsync(e => e.Id == result.Id);
        dbRecord.Should().NotBeNull();
        dbRecord!.FileUrl.Should().Be(expectedCloudinaryUrl);
        dbRecord.FileName.Should().Be("water2.jpg");

        _fileStorageServiceMock.Verify(x => x.UploadFileAsync(
            It.IsAny<Stream>(),
            "water2.jpg",
            "image/jpeg",
            "assetbridge/evidence",
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetIncidentsAsync_ShouldReturnIncidentsForAuthenticatedOwner()
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
            Title = "Water Leak",
            Description = "Leak in kitchen",
            Category = IncidentCategory.Plumbing,
            Priority = IncidentPriority.High,
            Status = IncidentStatus.Reported
        };

        _dbContext.Incidents.Add(incident);
        await _dbContext.SaveChangesAsync();

        var query = new IncidentQueryParametersDto();

        // Act
        var result = await _sut.GetIncidentsAsync(query);

        // Assert
        result.Should().NotBeNull();
        result.Items.Should().ContainSingle();
        result.Items.First().Id.Should().Be(incident.Id);
        result.Items.First().Title.Should().Be("Water Leak");
    }
    [Fact]
public async Task GetIncidentEvidenceAsync_ShouldReturnEvidenceForAuthorizedOwner()
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
        Title = "Water Leak",
        Description = "Leak in kitchen",
        Category = IncidentCategory.Plumbing,
        Priority = IncidentPriority.High,
        Status = IncidentStatus.Reported
    };

    _dbContext.Incidents.Add(incident);
    await _dbContext.SaveChangesAsync();

    var evidence = new IncidentEvidence
    {
        Id = Guid.NewGuid(),
        IncidentId = incident.Id,
        UploadedByUserId = _owner1Id,
        FileName = "leak-photo.jpg",
        FileUrl = "https://example.com/leak-photo.jpg"
    };

    _dbContext.IncidentEvidence.Add(evidence);
    await _dbContext.SaveChangesAsync();

    // Act
    var result = await _sut.GetIncidentEvidenceAsync(incident.Id);

    // Assert
    result.Should().NotBeNull();
    result.Should().ContainSingle();
    result.First().Id.Should().Be(evidence.Id);
    result.First().FileName.Should().Be("leak-photo.jpg");
 }
  [Fact]
public async Task DeleteEvidenceAsync_ShouldDeleteEvidenceForAuthorizedOwner()
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
        Title = "Broken Window",
        Description = "Window damaged",
        Category = IncidentCategory.Structural,
        Priority = IncidentPriority.Medium,
        Status = IncidentStatus.Reported
    };

    _dbContext.Incidents.Add(incident);
    await _dbContext.SaveChangesAsync();

    var evidence = new IncidentEvidence
    {
        Id = Guid.NewGuid(),
        IncidentId = incident.Id,
        UploadedByUserId = _owner1Id,
        FileName = "window-photo.jpg",
        FileUrl = "https://example.com/window-photo.jpg"
    };

    _dbContext.IncidentEvidence.Add(evidence);
    await _dbContext.SaveChangesAsync();

    // Act
    var result = await _sut.DeleteEvidenceAsync(incident.Id, evidence.Id);

    // Assert
    result.Should().BeTrue();

    var deletedEvidence = await _dbContext.IncidentEvidence
        .FirstOrDefaultAsync(e => e.Id == evidence.Id);

    deletedEvidence.Should().BeNull();
}
[Fact]
public async Task UpdateIncidentAsync_ShouldUpdateIncidentDetailsForAuthorizedOwner()
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
        Title = "Old Title",
        Description = "Old description",
        Category = IncidentCategory.Plumbing,
        Priority = IncidentPriority.Medium,
        Status = IncidentStatus.Reported
    };

    _dbContext.Incidents.Add(incident);
    await _dbContext.SaveChangesAsync();

    var updateDto = new UpdateIncidentRequestDto
    {
        Title = "Updated Water Leak",
        Description = "Updated description",
        Category = IncidentCategory.Structural,
        Priority = IncidentPriority.High,
        EstimatedBudget = 75000m,
        RequiredByUtc = DateTime.UtcNow.AddDays(7)
    };

    // Act
    var result = await _sut.UpdateIncidentAsync(incident.Id, updateDto);

    // Assert
    result.Should().NotBeNull();
    result.Title.Should().Be("Updated Water Leak");
    result.Description.Should().Be("Updated description");
    result.Category.Should().Be(IncidentCategory.Structural);
    result.Priority.Should().Be(IncidentPriority.High);
    result.EstimatedBudget.Should().Be(75000m);

    var updatedIncident = await _dbContext.Incidents
        .FirstAsync(i => i.Id == incident.Id);

    updatedIncident.Title.Should().Be("Updated Water Leak");
    updatedIncident.Description.Should().Be("Updated description");
    updatedIncident.Category.Should().Be(IncidentCategory.Structural);
    updatedIncident.Priority.Should().Be(IncidentPriority.High);
}
[Fact]
public async Task UpdateIncidentAsync_ShouldThrowValidationException_WhenBudgetIsNegative()
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
        Title = "Budget Test",
        Description = "Testing budget validation",
        Category = IncidentCategory.Plumbing,
        Priority = IncidentPriority.Medium,
        Status = IncidentStatus.Reported
    };

    _dbContext.Incidents.Add(incident);
    await _dbContext.SaveChangesAsync();

    var updateDto = new UpdateIncidentRequestDto
    {
        Title = "Updated Budget Test",
        Description = "Updated description",
        Category = IncidentCategory.Plumbing,
        Priority = IncidentPriority.Medium,
        EstimatedBudget = -1000m,
        RequiredByUtc = DateTime.UtcNow.AddDays(7)
    };

    // Act
    Func<Task> act = async () =>
        await _sut.UpdateIncidentAsync(incident.Id, updateDto);

    // Assert
    await act.Should().ThrowAsync<ValidationException>();
}

[Fact]
public async Task UpdateIncidentAsync_ShouldThrowValidationException_WhenDeadlineIsInPast()
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
        Title = "Deadline Test",
        Description = "Testing deadline validation",
        Category = IncidentCategory.Plumbing,
        Priority = IncidentPriority.Medium,
        Status = IncidentStatus.Reported
    };

    _dbContext.Incidents.Add(incident);
    await _dbContext.SaveChangesAsync();

    var updateDto = new UpdateIncidentRequestDto
    {
        Title = "Updated Deadline Test",
        Description = "Updated description",
        Category = IncidentCategory.Plumbing,
        Priority = IncidentPriority.Medium,
        RequiredByUtc = DateTime.UtcNow.AddDays(-2)
    };

    // Act
    Func<Task> act = async () => await _sut.UpdateIncidentAsync(incident.Id, updateDto);

    // Assert
    await act.Should().ThrowAsync<ValidationException>()
        .WithMessage("*must be in the future*");
}

[Fact]
public async Task UpdateIncidentAsync_ShouldThrowEntityNotFoundException_WhenIncidentDoesNotExist()
{
    // Arrange
    _currentUserServiceMock.Setup(x => x.IsAuthenticated).Returns(true);
    _currentUserServiceMock.Setup(x => x.UserId).Returns(_owner1Id);
    _currentUserServiceMock.Setup(x => x.Role).Returns(UserRole.Owner);

    var nonExistentId = Guid.NewGuid();
    var updateDto = new UpdateIncidentRequestDto
    {
        Title = "Missing Incident",
        Description = "Description",
        Category = IncidentCategory.Electrical,
        Priority = IncidentPriority.Low
    };

    // Act
    Func<Task> act = async () => await _sut.UpdateIncidentAsync(nonExistentId, updateDto);

    // Assert
    await act.Should().ThrowAsync<EntityNotFoundException>();
}

[Fact]
public async Task UpdateIncidentStatusAsync_ShouldTransitionStatusAndRecordHistory_WhenValidTransition()
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
        Title = "Status Transition Test",
        Description = "Testing valid status transition",
        Category = IncidentCategory.Plumbing,
        Priority = IncidentPriority.Medium,
        Status = IncidentStatus.Reported
    };

    _dbContext.Incidents.Add(incident);
    await _dbContext.SaveChangesAsync();

    var statusRequest = new UpdateIncidentStatusRequestDto
    {
        Status = IncidentStatus.Planning,
        StatusChangeReason = "Incident verified and planning initiated"
    };

    // Act
    var result = await _sut.UpdateIncidentStatusAsync(incident.Id, statusRequest);

    // Assert
    result.Should().NotBeNull();
    result.Status.Should().Be(IncidentStatus.Planning);

    var updatedIncident = await _dbContext.Incidents.FindAsync(incident.Id);
    updatedIncident!.Status.Should().Be(IncidentStatus.Planning);

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
public async Task UpdateIncidentStatusAsync_ShouldThrowDomainException_WhenTransitionIsInvalid()
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
        Title = "Invalid Transition Test",
        Description = "Testing invalid status transition",
        Category = IncidentCategory.Plumbing,
        Priority = IncidentPriority.Medium,
        Status = IncidentStatus.Reported
    };

    _dbContext.Incidents.Add(incident);
    await _dbContext.SaveChangesAsync();

    var invalidRequest = new UpdateIncidentStatusRequestDto
    {
        Status = IncidentStatus.Resolved // Cannot jump directly from Reported to Resolved
    };

    // Act
    Func<Task> act = async () => await _sut.UpdateIncidentStatusAsync(incident.Id, invalidRequest);

    // Assert
    await act.Should().ThrowAsync<DomainException>()
        .WithMessage("*Invalid status transition*");
}

[Fact]
public async Task AddEvidenceAsync_ShouldThrowValidationException_WhenBlobUrlProvided()
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
        Title = "Blob Evidence Test",
        Description = "Testing blob URL rejection",
        Category = IncidentCategory.Plumbing,
        Priority = IncidentPriority.Medium,
        Status = IncidentStatus.Reported
    };

    _dbContext.Incidents.Add(incident);
    await _dbContext.SaveChangesAsync();

    var request = new AddIncidentEvidenceRequestDto
    {
        FileName = "pipe.jpg",
        FileUrl = "blob:http://localhost:3000/blob-id",
        FileType = "image/jpeg",
        EvidenceType = EvidenceType.Photo
    };

    // Act
    Func<Task> act = async () => await _sut.AddEvidenceAsync(incident.Id, request);

    // Assert
    await act.Should().ThrowAsync<ValidationException>()
        .WithMessage("*blob URLs cannot be stored*");
}

[Fact]
public async Task AddEvidenceAsync_ShouldThrowValidationException_WhenInvalidUrlProvided()
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
        Title = "Invalid URL Test",
        Description = "Testing invalid URL rejection",
        Category = IncidentCategory.Plumbing,
        Priority = IncidentPriority.Medium,
        Status = IncidentStatus.Reported
    };

    _dbContext.Incidents.Add(incident);
    await _dbContext.SaveChangesAsync();

    var request = new AddIncidentEvidenceRequestDto
    {
        FileName = "pipe.jpg",
        FileUrl = "invalid-url-scheme",
        FileType = "image/jpeg",
        EvidenceType = EvidenceType.Photo
    };

    // Act
    Func<Task> act = async () => await _sut.AddEvidenceAsync(incident.Id, request);

    // Assert
    await act.Should().ThrowAsync<ValidationException>()
        .WithMessage("*valid absolute HTTPS*");
}

[Fact]
public async Task DeleteEvidenceAsync_ShouldThrowEntityNotFoundException_WhenEvidenceDoesNotExist()
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
        Title = "Delete Evidence Test",
        Description = "Testing non-existent evidence deletion",
        Category = IncidentCategory.Plumbing,
        Priority = IncidentPriority.Medium,
        Status = IncidentStatus.Reported
    };

    _dbContext.Incidents.Add(incident);
    await _dbContext.SaveChangesAsync();

    var nonExistentEvidenceId = Guid.NewGuid();

    // Act
    Func<Task> act = async () => await _sut.DeleteEvidenceAsync(incident.Id, nonExistentEvidenceId);

    // Assert
    await act.Should().ThrowAsync<EntityNotFoundException>();
}
}