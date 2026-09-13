using AssetBridge.Application.Common.Interfaces;
using AssetBridge.Application.DTOs.Representatives;
using AssetBridge.Application.Services.Implementations;
using AssetBridge.Domain.Entities.Representatives;
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

public class RepresentativeServiceTests : IDisposable
{
    private readonly AssetBridgeDbContext _dbContext;
    private readonly Mock<ICurrentUserService> _currentUserServiceMock;
    private readonly Mock<ILogger<RepresentativeService>> _loggerMock;
    private readonly RepresentativeService _sut;

    private readonly Guid _repUser1Id = Guid.NewGuid();
    private readonly Guid _repUser2Id = Guid.NewGuid();
    private readonly Guid _ownerUserId = Guid.NewGuid();
    private readonly Guid _managerUserId = Guid.NewGuid();

    public RepresentativeServiceTests()
    {
        var dbOptions = new DbContextOptionsBuilder<AssetBridgeDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _dbContext = new AssetBridgeDbContext(dbOptions);
        _currentUserServiceMock = new Mock<ICurrentUserService>();
        _loggerMock = new Mock<ILogger<RepresentativeService>>();

        _sut = new RepresentativeService(
            _dbContext,
            _currentUserServiceMock.Object,
            _loggerMock.Object);

        SeedTestUsers();
    }

    private void SeedTestUsers()
    {
        _dbContext.Users.AddRange(
            new User { Id = _repUser1Id, FullName = "Kamsiga Rep", Email = "rep1@assetbridge.ai", Role = UserRole.Representative },
            new User { Id = _repUser2Id, FullName = "Other Rep", Email = "rep2@assetbridge.ai", Role = UserRole.Representative },
            new User { Id = _ownerUserId, FullName = "Overseas Owner", Email = "owner@assetbridge.ai", Role = UserRole.Owner },
            new User { Id = _managerUserId, FullName = "Admin Manager", Email = "manager@assetbridge.ai", Role = UserRole.Manager }
        );
        _dbContext.SaveChanges();
    }

    public void Dispose()
    {
        _dbContext.Database.EnsureDeleted();
        _dbContext.Dispose();
    }

    [Fact]
    public async Task CreateRepresentative_WithValidData_ShouldCreatePendingRepresentative()
    {
        // Arrange
        _currentUserServiceMock.Setup(s => s.IsAuthenticated).Returns(true);
        _currentUserServiceMock.Setup(s => s.UserId).Returns(_repUser1Id);
        _currentUserServiceMock.Setup(s => s.Role).Returns(UserRole.Representative);

        var request = new CreateRepresentativeRequestDto
        {
            FullName = "Kamsiga Ganesan",
            PhoneNumber = "+94771234567",
            Email = "kamsiga@assetbridge.ai",
            District = "Kandy",
            City = "Peradeniya",
            Address = "123 Peradeniya Road",
            NationalIdNumber = "200012345678",
            Bio = "Experienced local property coordinator in Kandy."
        };

        // Act
        var result = await _sut.CreateRepresentativeAsync(request);

        // Assert
        result.Should().NotBeNull();
        result.FullName.Should().Be("Kamsiga Ganesan");
        result.District.Should().Be("Kandy");
        result.City.Should().Be("Peradeniya");
        result.VerificationStatus.Should().Be(VerificationStatus.Pending);
        result.IsActive.Should().BeTrue();
    }

    [Fact]
    public async Task CreateRepresentative_WhenProfileAlreadyExists_ShouldThrowValidationException()
    {
        // Arrange
        _currentUserServiceMock.Setup(s => s.IsAuthenticated).Returns(true);
        _currentUserServiceMock.Setup(s => s.UserId).Returns(_repUser1Id);
        _currentUserServiceMock.Setup(s => s.Role).Returns(UserRole.Representative);

        var request = new CreateRepresentativeRequestDto
        {
            FullName = "Kamsiga Ganesan",
            PhoneNumber = "+94771234567",
            Email = "kamsiga@assetbridge.ai",
            District = "Kandy",
            City = "Peradeniya"
        };

        await _sut.CreateRepresentativeAsync(request);

        // Act & Assert
        await Assert.ThrowsAsync<ValidationException>(() => _sut.CreateRepresentativeAsync(request));
    }

    [Fact]
    public async Task GetRepresentatives_AsOwner_ShouldOnlyReturnVerifiedActiveRepresentatives()
    {
        // Arrange
        _dbContext.Representatives.AddRange(
            new Representative
            {
                Id = Guid.NewGuid(),
                UserId = _repUser1Id,
                FullName = "Verified Rep",
                PhoneNumber = "0771111111",
                Email = "verified@assetbridge.ai",
                District = "Colombo",
                City = "Colombo 03",
                VerificationStatus = VerificationStatus.Verified,
                IsActive = true
            },
            new Representative
            {
                Id = Guid.NewGuid(),
                UserId = _repUser2Id,
                FullName = "Pending Rep",
                PhoneNumber = "0772222222",
                Email = "pending@assetbridge.ai",
                District = "Colombo",
                City = "Colombo 04",
                VerificationStatus = VerificationStatus.Pending,
                IsActive = true
            }
        );
        await _dbContext.SaveChangesAsync();

        _currentUserServiceMock.Setup(s => s.IsAuthenticated).Returns(true);
        _currentUserServiceMock.Setup(s => s.UserId).Returns(_ownerUserId);
        _currentUserServiceMock.Setup(s => s.Role).Returns(UserRole.Owner);

        var query = new RepresentativeQueryParametersDto { District = "Colombo" };

        // Act
        var result = await _sut.GetRepresentativesAsync(query);

        // Assert
        result.Items.Should().HaveCount(1);
        result.Items.First().FullName.Should().Be("Verified Rep");
        result.Items.First().VerificationStatus.Should().Be(VerificationStatus.Verified);
    }

    [Fact]
    public async Task UpdateVerificationStatus_AsManager_ShouldSucceed()
    {
        // Arrange
        var rep = new Representative
        {
            Id = Guid.NewGuid(),
            UserId = _repUser1Id,
            FullName = "Kamsiga Rep",
            PhoneNumber = "0771234567",
            Email = "rep@assetbridge.ai",
            District = "Kandy",
            City = "Kandy",
            VerificationStatus = VerificationStatus.Pending
        };
        _dbContext.Representatives.Add(rep);
        await _dbContext.SaveChangesAsync();

        _currentUserServiceMock.Setup(s => s.IsAuthenticated).Returns(true);
        _currentUserServiceMock.Setup(s => s.UserId).Returns(_managerUserId);
        _currentUserServiceMock.Setup(s => s.Role).Returns(UserRole.Manager);

        var request = new UpdateVerificationRequestDto
        {
            VerificationStatus = VerificationStatus.Verified,
            VerificationNotes = "Verified via National ID check and local address visit."
        };

        // Act
        var result = await _sut.UpdateVerificationStatusAsync(rep.Id, request);

        // Assert
        result.VerificationStatus.Should().Be(VerificationStatus.Verified);
        result.VerificationNotes.Should().Contain("National ID check");
    }

    [Fact]
    public async Task UpdateVerificationStatus_AsRepresentative_ShouldThrowUnauthorizedAccessException()
    {
        // Arrange
        var rep = new Representative
        {
            Id = Guid.NewGuid(),
            UserId = _repUser1Id,
            FullName = "Kamsiga Rep",
            PhoneNumber = "0771234567",
            Email = "rep@assetbridge.ai",
            District = "Kandy",
            City = "Kandy",
            VerificationStatus = VerificationStatus.Pending
        };
        _dbContext.Representatives.Add(rep);
        await _dbContext.SaveChangesAsync();

        _currentUserServiceMock.Setup(s => s.IsAuthenticated).Returns(true);
        _currentUserServiceMock.Setup(s => s.UserId).Returns(_repUser1Id);
        _currentUserServiceMock.Setup(s => s.Role).Returns(UserRole.Representative);

        var request = new UpdateVerificationRequestDto
        {
            VerificationStatus = VerificationStatus.Verified
        };

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => _sut.UpdateVerificationStatusAsync(rep.Id, request));
    }
}
