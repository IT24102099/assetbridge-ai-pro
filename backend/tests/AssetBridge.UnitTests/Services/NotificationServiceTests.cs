using System;
using System.Linq;
using System.Threading.Tasks;
using AssetBridge.Application.DTOs.Notifications;
using AssetBridge.Application.Services.Implementations;
using AssetBridge.Domain.Entities.Users;
using AssetBridge.Domain.Entities.Workflow;
using AssetBridge.Domain.Enums;
using AssetBridge.Infrastructure.Persistence;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace AssetBridge.UnitTests.Services;

public class NotificationServiceTests : IDisposable
{
    private readonly AssetBridgeDbContext _dbContext;
    private readonly Mock<ILogger<NotificationService>> _loggerMock;
    private readonly NotificationService _sut;

    private readonly Guid _user1Id = Guid.NewGuid();
    private readonly Guid _user2Id = Guid.NewGuid();

    public NotificationServiceTests()
    {
        var dbOptions = new DbContextOptionsBuilder<AssetBridgeDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _dbContext = new AssetBridgeDbContext(dbOptions);
        _loggerMock = new Mock<ILogger<NotificationService>>();
        _sut = new NotificationService(_dbContext, _loggerMock.Object);

        SeedTestUsers();
    }

    private void SeedTestUsers()
    {
        _dbContext.Users.AddRange(
            new User { Id = _user1Id, FullName = "Priyantha Jayawardena", Email = "owner1@assetbridge.ai", Role = UserRole.Owner },
            new User { Id = _user2Id, FullName = "Other User", Email = "other@assetbridge.ai", Role = UserRole.Owner }
        );
        _dbContext.SaveChanges();
    }

    [Fact]
    public async Task CreateNotificationAsync_ShouldCreateAndPersistNotification()
    {
        // Arrange
        var dto = new CreateNotificationDto
        {
            UserId = _user1Id,
            Title = "Water Leak Reported",
            Message = "A water leak was detected in unit 4B.",
            Type = NotificationType.WorkflowStatusChanged
        };

        // Act
        var result = await _sut.CreateNotificationAsync(dto);

        // Assert
        result.Should().NotBeNull();
        result!.Title.Should().Be("Water Leak Reported");
        result.IsRead.Should().BeFalse();

        var inDb = await _dbContext.Notifications.FindAsync(result.Id);
        inDb.Should().NotBeNull();
        inDb!.UserId.Should().Be(_user1Id);
    }

    [Fact]
    public async Task CreateNotificationAsync_ShouldSkipDuplicate_WhenSameNotificationCreatedWithinCutoff()
    {
        // Arrange
        var dto = new CreateNotificationDto
        {
            UserId = _user1Id,
            Title = "Emergency Alert",
            Message = "Power failure in building.",
            Type = NotificationType.WorkflowStatusChanged
        };

        // Act
        var first = await _sut.CreateNotificationAsync(dto);
        var second = await _sut.CreateNotificationAsync(dto);

        // Assert
        first.Should().NotBeNull();
        second.Should().BeNull(); // Deduplicated
    }

    [Fact]
    public async Task GetUserNotificationsAsync_ShouldEnforceUserIsolation()
    {
        // Arrange
        _dbContext.Notifications.AddRange(
            new Notification { Id = Guid.NewGuid(), UserId = _user1Id, Title = "User 1 Note", Message = "Msg 1", CreatedAtUtc = DateTime.UtcNow },
            new Notification { Id = Guid.NewGuid(), UserId = _user2Id, Title = "User 2 Note", Message = "Msg 2", CreatedAtUtc = DateTime.UtcNow }
        );
        await _dbContext.SaveChangesAsync();

        // Act
        var user1Notes = await _sut.GetUserNotificationsAsync(_user1Id);

        // Assert
        user1Notes.Should().HaveCount(1);
        user1Notes[0].Title.Should().Be("User 1 Note");
    }

    [Fact]
    public async Task MarkAsReadAsync_ShouldMarkNotificationAsRead_WhenUserIsAuthorized()
    {
        // Arrange
        var note = new Notification
        {
            Id = Guid.NewGuid(),
            UserId = _user1Id,
            Title = "Unread Note",
            Message = "Testing mark as read",
            IsRead = false,
            CreatedAtUtc = DateTime.UtcNow
        };
        _dbContext.Notifications.Add(note);
        await _dbContext.SaveChangesAsync();

        // Act
        var success = await _sut.MarkAsReadAsync(note.Id, _user1Id);

        // Assert
        success.Should().BeTrue();
        var refreshed = await _dbContext.Notifications.FindAsync(note.Id);
        refreshed!.IsRead.Should().BeTrue();
    }

    [Fact]
    public async Task MarkAsReadAsync_ShouldFail_WhenUserIsNotRecipient()
    {
        // Arrange
        var note = new Notification
        {
            Id = Guid.NewGuid(),
            UserId = _user1Id,
            Title = "Private Note",
            Message = "Should not be read by user 2",
            IsRead = false,
            CreatedAtUtc = DateTime.UtcNow
        };
        _dbContext.Notifications.Add(note);
        await _dbContext.SaveChangesAsync();

        // Act
        var success = await _sut.MarkAsReadAsync(note.Id, _user2Id);

        // Assert
        success.Should().BeFalse();
        var refreshed = await _dbContext.Notifications.FindAsync(note.Id);
        refreshed!.IsRead.Should().BeFalse();
    }

    [Fact]
    public async Task MarkAllAsReadAsync_ShouldMarkAllUnreadNotesForUser()
    {
        // Arrange
        _dbContext.Notifications.AddRange(
            new Notification { Id = Guid.NewGuid(), UserId = _user1Id, Title = "Note 1", Message = "M1", IsRead = false, CreatedAtUtc = DateTime.UtcNow },
            new Notification { Id = Guid.NewGuid(), UserId = _user1Id, Title = "Note 2", Message = "M2", IsRead = false, CreatedAtUtc = DateTime.UtcNow },
            new Notification { Id = Guid.NewGuid(), UserId = _user2Id, Title = "User 2 Note", Message = "M3", IsRead = false, CreatedAtUtc = DateTime.UtcNow }
        );
        await _dbContext.SaveChangesAsync();

        // Act
        var success = await _sut.MarkAllAsReadAsync(_user1Id);

        // Assert
        success.Should().BeTrue();
        var user1UnreadCount = await _sut.GetUnreadCountAsync(_user1Id);
        user1UnreadCount.Should().Be(0);

        var user2UnreadCount = await _sut.GetUnreadCountAsync(_user2Id);
        user2UnreadCount.Should().Be(1);
    }

    public void Dispose()
    {
        _dbContext.Dispose();
    }
}
