using AssetBridge.Application.Common.Interfaces;
using AssetBridge.Application.DTOs.Assets;
using AssetBridge.Application.Services.Implementations;
using AssetBridge.Application.Services.Interfaces;
using AssetBridge.Domain.Entities.Assets;
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

public class AssetServiceTests : IDisposable
{
    private readonly AssetBridgeDbContext _dbContext;
    private readonly Mock<ICurrentUserService> _currentUserServiceMock;
    private readonly Mock<IAssetHistoryService> _historyServiceMock;
    private readonly Mock<ILogger<AssetService>> _loggerMock;
    private readonly AssetService _sut;

    private readonly Guid _owner1Id = Guid.NewGuid();
    private readonly Guid _owner2Id = Guid.NewGuid();
    private readonly Guid _managerId = Guid.NewGuid();

    public AssetServiceTests()
    {
        var dbOptions = new DbContextOptionsBuilder<AssetBridgeDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _dbContext = new AssetBridgeDbContext(dbOptions);
        _currentUserServiceMock = new Mock<ICurrentUserService>();
        _historyServiceMock = new Mock<IAssetHistoryService>();
        _loggerMock = new Mock<ILogger<AssetService>>();

        _sut = new AssetService(
            _dbContext,
            _currentUserServiceMock.Object,
            _historyServiceMock.Object,
            _loggerMock.Object);

        SeedTestUsers();
    }

    private void SeedTestUsers()
    {
        _dbContext.Users.AddRange(
            new User { Id = _owner1Id, FullName = "Moosika Owner", Email = "owner1@assetbridge.ai", Role = UserRole.Owner },
            new User { Id = _owner2Id, FullName = "Other Owner", Email = "owner2@assetbridge.ai", Role = UserRole.Owner },
            new User { Id = _managerId, FullName = "Manager User", Email = "manager@assetbridge.ai", Role = UserRole.Manager }
        );
        _dbContext.SaveChanges();
    }

    public void Dispose()
    {
        _dbContext.Database.EnsureDeleted();
        _dbContext.Dispose();
    }

    [Fact]
    public async Task CreateAssetAsync_ShouldCreateAssetAndRecordHistory_WhenValid()
    {
        // Arrange
        _currentUserServiceMock.Setup(x => x.IsAuthenticated).Returns(true);
        _currentUserServiceMock.Setup(x => x.UserId).Returns(_owner1Id);
        _currentUserServiceMock.Setup(x => x.Role).Returns(UserRole.Owner);

        var request = new CreateAssetRequestDto
        {
            Name = "Victoria Villa Kandy",
            PropertyType = PropertyType.Villa,
            AddressLine1 = "12 Lake Road",
            City = "Kandy",
            District = "Kandy",
            Latitude = 7.2906,
            Longitude = 80.6337,
            Description = "Hill country residential villa"
        };

        // Act
        var result = await _sut.CreateAssetAsync(request);

        // Assert
        result.Should().NotBeNull();
        result.Name.Should().Be("Victoria Villa Kandy");
        result.OwnerId.Should().Be(_owner1Id);
        result.City.Should().Be("Kandy");
        result.Status.Should().Be(AssetStatus.Active);

        _historyServiceMock.Verify(x => x.RecordEventAsync(
            result.Id,
            AssetHistoryEventType.AssetCreated,
            It.IsAny<string>(),
            It.IsAny<string>(),
            _owner1Id,
            null,
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetAssetByIdAsync_ShouldReturnAsset_WhenOwnerAccessesOwnAsset()
    {
        // Arrange
        _currentUserServiceMock.Setup(x => x.IsAuthenticated).Returns(true);
        _currentUserServiceMock.Setup(x => x.UserId).Returns(_owner1Id);
        _currentUserServiceMock.Setup(x => x.Role).Returns(UserRole.Owner);

        var asset = new Asset
        {
            Id = Guid.NewGuid(),
            OwnerId = _owner1Id,
            Name = "Colombo City Apartment",
            PropertyType = PropertyType.Apartment,
            AddressLine1 = "45 Galle Road",
            City = "Colombo",
            District = "Colombo",
            Status = AssetStatus.Active
        };
        _dbContext.Assets.Add(asset);
        await _dbContext.SaveChangesAsync();

        // Act
        var result = await _sut.GetAssetByIdAsync(asset.Id);

        // Assert
        result.Should().NotBeNull();
        result.Id.Should().Be(asset.Id);
        result.Name.Should().Be("Colombo City Apartment");
    }

    [Fact]
    public async Task GetAssetByIdAsync_ShouldThrowUnauthorized_WhenOwnerAccessesAnotherOwnersAsset()
    {
        // Arrange
        _currentUserServiceMock.Setup(x => x.IsAuthenticated).Returns(true);
        _currentUserServiceMock.Setup(x => x.UserId).Returns(_owner1Id);
        _currentUserServiceMock.Setup(x => x.Role).Returns(UserRole.Owner);

        // Asset belongs to Owner 2
        var asset = new Asset
        {
            Id = Guid.NewGuid(),
            OwnerId = _owner2Id,
            Name = "Galle Fort House",
            PropertyType = PropertyType.SingleFamilyHouse,
            AddressLine1 = "10 Church Street",
            City = "Galle",
            District = "Galle",
            Status = AssetStatus.Active
        };
        _dbContext.Assets.Add(asset);
        await _dbContext.SaveChangesAsync();

        // Act
        var act = () => _sut.GetAssetByIdAsync(asset.Id);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("*not have permission*");
    }

    [Fact]
    public async Task GetAssetsAsync_ShouldFilterByOwner_WhenCallerIsOwner()
    {
        // Arrange
        _currentUserServiceMock.Setup(x => x.IsAuthenticated).Returns(true);
        _currentUserServiceMock.Setup(x => x.UserId).Returns(_owner1Id);
        _currentUserServiceMock.Setup(x => x.Role).Returns(UserRole.Owner);

        _dbContext.Assets.AddRange(
            new Asset { Id = Guid.NewGuid(), OwnerId = _owner1Id, Name = "Owner1 Asset A", City = "Kandy", District = "Kandy", AddressLine1 = "A" },
            new Asset { Id = Guid.NewGuid(), OwnerId = _owner1Id, Name = "Owner1 Asset B", City = "Colombo", District = "Colombo", AddressLine1 = "B" },
            new Asset { Id = Guid.NewGuid(), OwnerId = _owner2Id, Name = "Owner2 Asset C", City = "Galle", District = "Galle", AddressLine1 = "C" }
        );
        await _dbContext.SaveChangesAsync();

        // Act
        var result = await _sut.GetAssetsAsync(new AssetQueryParametersDto());

        // Assert
        result.Should().NotBeNull();
        result.TotalCount.Should().Be(2);
        result.Items.Should().OnlyContain(a => a.OwnerId == _owner1Id);
    }

    [Fact]
    public async Task GetAssetsAsync_ShouldAllowManager_ToViewAllAssets()
    {
        // Arrange
        _currentUserServiceMock.Setup(x => x.IsAuthenticated).Returns(true);
        _currentUserServiceMock.Setup(x => x.UserId).Returns(_managerId);
        _currentUserServiceMock.Setup(x => x.Role).Returns(UserRole.Manager);

        _dbContext.Assets.AddRange(
            new Asset { Id = Guid.NewGuid(), OwnerId = _owner1Id, Name = "Owner1 Asset", City = "Kandy", District = "Kandy", AddressLine1 = "A" },
            new Asset { Id = Guid.NewGuid(), OwnerId = _owner2Id, Name = "Owner2 Asset", City = "Galle", District = "Galle", AddressLine1 = "B" }
        );
        await _dbContext.SaveChangesAsync();

        // Act
        var result = await _sut.GetAssetsAsync(new AssetQueryParametersDto());

        // Assert
        result.TotalCount.Should().Be(2);
    }

    [Fact]
    public async Task DeleteAssetAsync_ShouldSoftDeleteToArchived()
    {
        // Arrange
        _currentUserServiceMock.Setup(x => x.IsAuthenticated).Returns(true);
        _currentUserServiceMock.Setup(x => x.UserId).Returns(_owner1Id);
        _currentUserServiceMock.Setup(x => x.Role).Returns(UserRole.Owner);

        var asset = new Asset
        {
            Id = Guid.NewGuid(),
            OwnerId = _owner1Id,
            Name = "To Archive House",
            City = "Kandy",
            District = "Kandy",
            AddressLine1 = "100 Hill St",
            Status = AssetStatus.Active
        };
        _dbContext.Assets.Add(asset);
        await _dbContext.SaveChangesAsync();

        // Act
        var result = await _sut.DeleteAssetAsync(asset.Id);

        // Assert
        result.Should().BeTrue();
        var updated = await _dbContext.Assets.FindAsync(asset.Id);
        updated!.Status.Should().Be(AssetStatus.Archived);

        _historyServiceMock.Verify(x => x.RecordEventAsync(
            asset.Id,
            AssetHistoryEventType.AssetArchived,
            It.IsAny<string>(),
            It.IsAny<string>(),
            _owner1Id,
            null,
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task AddMediaAsync_ShouldAddMediaAndSetFirstAsThumbnail_WhenNoneExist()
    {
        // Arrange
        _currentUserServiceMock.Setup(x => x.IsAuthenticated).Returns(true);
        _currentUserServiceMock.Setup(x => x.UserId).Returns(_owner1Id);
        _currentUserServiceMock.Setup(x => x.Role).Returns(UserRole.Owner);

        var asset = new Asset { Id = Guid.NewGuid(), OwnerId = _owner1Id, Name = "Media Test Villa", City = "Kandy", District = "Kandy", AddressLine1 = "100 Hill St" };
        _dbContext.Assets.Add(asset);
        await _dbContext.SaveChangesAsync();

        var request = new AddAssetMediaRequestDto
        {
            FileName = "front_elevation.jpg",
            FileUrl = "https://storage.assetbridge.ai/media/front.jpg",
            FileType = "image/jpeg",
            FileSizeBytes = 1024000,
            IsThumbnail = false // Even if false, should default to true for the first media
        };

        // Act
        var result = await _sut.AddMediaAsync(asset.Id, request);

        // Assert
        result.Should().NotBeNull();
        result.IsThumbnail.Should().BeTrue();
        result.FileName.Should().Be("front_elevation.jpg");

        var mediaInDb = await _dbContext.AssetMedia.FirstOrDefaultAsync(m => m.Id == result.Id);
        mediaInDb.Should().NotBeNull();
        mediaInDb!.IsThumbnail.Should().BeTrue();
    }

    [Fact]
    public async Task AddMediaAsync_ShouldUnsetPreviousThumbnail_WhenNewMediaIsDesignatedThumbnail()
    {
        // Arrange
        _currentUserServiceMock.Setup(x => x.IsAuthenticated).Returns(true);
        _currentUserServiceMock.Setup(x => x.UserId).Returns(_owner1Id);
        _currentUserServiceMock.Setup(x => x.Role).Returns(UserRole.Owner);

        var asset = new Asset { Id = Guid.NewGuid(), OwnerId = _owner1Id, Name = "Media Test Villa 2", City = "Colombo", District = "Colombo", AddressLine1 = "50 Galle Rd" };
        var firstMedia = new AssetMedia
        {
            Id = Guid.NewGuid(),
            AssetId = asset.Id,
            UploadedByUserId = _owner1Id,
            FileName = "first.jpg",
            FileUrl = "https://storage.assetbridge.ai/media/first.jpg",
            FileType = "image/jpeg",
            FileSizeBytes = 500000,
            IsThumbnail = true,
            CreatedAtUtc = DateTime.UtcNow.AddMinutes(-10)
        };
        asset.Media.Add(firstMedia);
        _dbContext.Assets.Add(asset);
        await _dbContext.SaveChangesAsync();

        var secondMediaRequest = new AddAssetMediaRequestDto
        {
            FileName = "new_cover.png",
            FileUrl = "https://storage.assetbridge.ai/media/new_cover.png",
            FileType = "image/png",
            FileSizeBytes = 800000,
            IsThumbnail = true
        };

        // Act
        var result = await _sut.AddMediaAsync(asset.Id, secondMediaRequest);

        // Assert
        result.IsThumbnail.Should().BeTrue();

        var allMedia = await _dbContext.AssetMedia.Where(m => m.AssetId == asset.Id).ToListAsync();
        allMedia.Count(m => m.IsThumbnail).Should().Be(1, "Strictly exactly ONE thumbnail must exist");
        allMedia.First(m => m.Id == firstMedia.Id).IsThumbnail.Should().BeFalse();
        allMedia.First(m => m.Id == result.Id).IsThumbnail.Should().BeTrue();
    }

    [Fact]
    public async Task AddMediaAsync_ShouldThrowValidationException_WhenFileSizeExceedsLimit()
    {
        // Arrange
        _currentUserServiceMock.Setup(x => x.IsAuthenticated).Returns(true);
        _currentUserServiceMock.Setup(x => x.UserId).Returns(_owner1Id);
        _currentUserServiceMock.Setup(x => x.Role).Returns(UserRole.Owner);

        var asset = new Asset { Id = Guid.NewGuid(), OwnerId = _owner1Id, Name = "Size Test Villa", City = "Kandy", District = "Kandy", AddressLine1 = "100 Hill St" };
        _dbContext.Assets.Add(asset);
        await _dbContext.SaveChangesAsync();

        var oversizedRequest = new AddAssetMediaRequestDto
        {
            FileName = "huge_photo.jpg",
            FileUrl = "https://storage.assetbridge.ai/media/huge.jpg",
            FileType = "image/jpeg",
            FileSizeBytes = 15 * 1024 * 1024 // 15MB > 10MB limit
        };

        // Act
        var act = () => _sut.AddMediaAsync(asset.Id, oversizedRequest);

        // Assert
        await act.Should().ThrowAsync<ValidationException>()
            .WithMessage("*cannot exceed 10MB*");
    }

    [Fact]
    public async Task AddMediaAsync_ShouldThrowValidationException_WhenExtensionIsInvalid()
    {
        // Arrange
        _currentUserServiceMock.Setup(x => x.IsAuthenticated).Returns(true);
        _currentUserServiceMock.Setup(x => x.UserId).Returns(_owner1Id);
        _currentUserServiceMock.Setup(x => x.Role).Returns(UserRole.Owner);

        var asset = new Asset { Id = Guid.NewGuid(), OwnerId = _owner1Id, Name = "Ext Test Villa", City = "Kandy", District = "Kandy", AddressLine1 = "100 Hill St" };
        _dbContext.Assets.Add(asset);
        await _dbContext.SaveChangesAsync();

        var invalidRequest = new AddAssetMediaRequestDto
        {
            FileName = "malicious_script.exe",
            FileUrl = "https://storage.assetbridge.ai/media/script.exe",
            FileType = "application/x-msdownload",
            FileSizeBytes = 10000
        };

        // Act
        var act = () => _sut.AddMediaAsync(asset.Id, invalidRequest);

        // Assert
        await act.Should().ThrowAsync<ValidationException>()
            .WithMessage("*Only JPG, PNG, and WEBP formats are accepted*");
    }

    [Fact]
    public async Task SetThumbnailAsync_ShouldEnsureOnlyOneThumbnail_WhenChangingThumbnail()
    {
        // Arrange
        _currentUserServiceMock.Setup(x => x.IsAuthenticated).Returns(true);
        _currentUserServiceMock.Setup(x => x.UserId).Returns(_owner1Id);
        _currentUserServiceMock.Setup(x => x.Role).Returns(UserRole.Owner);

        var asset = new Asset { Id = Guid.NewGuid(), OwnerId = _owner1Id, Name = "Thumbnail Test Villa", City = "Galle", District = "Galle", AddressLine1 = "1 Fort St" };
        var media1 = new AssetMedia { Id = Guid.NewGuid(), AssetId = asset.Id, UploadedByUserId = _owner1Id, FileName = "m1.jpg", FileUrl = "url1", FileSizeBytes = 1000, IsThumbnail = true };
        var media2 = new AssetMedia { Id = Guid.NewGuid(), AssetId = asset.Id, UploadedByUserId = _owner1Id, FileName = "m2.jpg", FileUrl = "url2", FileSizeBytes = 1000, IsThumbnail = false };
        asset.Media.Add(media1);
        asset.Media.Add(media2);
        _dbContext.Assets.Add(asset);
        await _dbContext.SaveChangesAsync();

        // Act - Set media2 as thumbnail
        var result = await _sut.SetThumbnailAsync(asset.Id, media2.Id);

        // Assert
        result.Id.Should().Be(media2.Id);
        result.IsThumbnail.Should().BeTrue();

        var allMedia = await _dbContext.AssetMedia.Where(m => m.AssetId == asset.Id).ToListAsync();
        allMedia.Count(m => m.IsThumbnail).Should().Be(1);
        allMedia.First(m => m.Id == media1.Id).IsThumbnail.Should().BeFalse();
        allMedia.First(m => m.Id == media2.Id).IsThumbnail.Should().BeTrue();
    }

    [Fact]
    public async Task DeleteMediaAsync_ShouldPromoteNextMedia_WhenThumbnailIsDeleted()
    {
        // Arrange
        _currentUserServiceMock.Setup(x => x.IsAuthenticated).Returns(true);
        _currentUserServiceMock.Setup(x => x.UserId).Returns(_owner1Id);
        _currentUserServiceMock.Setup(x => x.Role).Returns(UserRole.Owner);

        var asset = new Asset { Id = Guid.NewGuid(), OwnerId = _owner1Id, Name = "Delete Media Villa", City = "Kandy", District = "Kandy", AddressLine1 = "100 Hill St" };
        var media1 = new AssetMedia { Id = Guid.NewGuid(), AssetId = asset.Id, UploadedByUserId = _owner1Id, FileName = "m1.jpg", FileUrl = "url1", FileSizeBytes = 1000, IsThumbnail = true, CreatedAtUtc = DateTime.UtcNow.AddMinutes(-5) };
        var media2 = new AssetMedia { Id = Guid.NewGuid(), AssetId = asset.Id, UploadedByUserId = _owner1Id, FileName = "m2.jpg", FileUrl = "url2", FileSizeBytes = 1000, IsThumbnail = false, CreatedAtUtc = DateTime.UtcNow };
        asset.Media.Add(media1);
        asset.Media.Add(media2);
        _dbContext.Assets.Add(asset);
        await _dbContext.SaveChangesAsync();

        // Act - Delete media1 (current thumbnail)
        var result = await _sut.DeleteMediaAsync(asset.Id, media1.Id);

        // Assert
        result.Should().BeTrue();
        var remainingMedia = await _dbContext.AssetMedia.Where(m => m.AssetId == asset.Id).ToListAsync();
        remainingMedia.Count.Should().Be(1);
        remainingMedia[0].Id.Should().Be(media2.Id);
        remainingMedia[0].IsThumbnail.Should().BeTrue("Remaining media should be promoted to thumbnail");
    }
}
