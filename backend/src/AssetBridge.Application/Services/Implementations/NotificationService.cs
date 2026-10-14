using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using AssetBridge.Application.Common.Interfaces;
using AssetBridge.Application.DTOs.Notifications;
using AssetBridge.Application.Services.Interfaces;
using AssetBridge.Domain.Entities.Workflow;
using AssetBridge.Domain.Exceptions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AssetBridge.Application.Services.Implementations;

public class NotificationService : INotificationService
{
    private readonly IApplicationDbContext _context;
    private readonly ILogger<NotificationService> _logger;

    public NotificationService(IApplicationDbContext context, ILogger<NotificationService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<List<NotificationDto>> GetUserNotificationsAsync(Guid userId, int limit = 20, CancellationToken cancellationToken = default)
    {
        var clampedLimit = Math.Clamp(limit, 1, 50);

        var notifications = await _context.Notifications
            .AsNoTracking()
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAtUtc)
            .Take(clampedLimit)
            .Select(n => new NotificationDto
            {
                Id = n.Id,
                UserId = n.UserId,
                Title = n.Title,
                Message = n.Message,
                Type = n.Type,
                TypeName = n.Type.ToString(),
                IsRead = n.IsRead,
                RelatedWorkflowInstanceId = n.RelatedWorkflowInstanceId,
                CreatedAtUtc = n.CreatedAtUtc
            })
            .ToListAsync(cancellationToken);

        return notifications;
    }

    public async Task<int> GetUnreadCountAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _context.Notifications
            .AsNoTracking()
            .Where(n => n.UserId == userId && !n.IsRead)
            .CountAsync(cancellationToken);
    }

    public async Task<bool> MarkAsReadAsync(Guid notificationId, Guid userId, CancellationToken cancellationToken = default)
    {
        var notification = await _context.Notifications
            .FirstOrDefaultAsync(n => n.Id == notificationId && n.UserId == userId, cancellationToken);

        if (notification == null)
        {
            return false;
        }

        if (!notification.IsRead)
        {
            notification.IsRead = true;
            notification.UpdatedAtUtc = DateTime.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);
        }

        return true;
    }

    public async Task<bool> MarkAllAsReadAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var unread = await _context.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .ToListAsync(cancellationToken);

        if (!unread.Any())
            return true;

        var now = DateTime.UtcNow;
        foreach (var n in unread)
        {
            n.IsRead = true;
            n.UpdatedAtUtc = now;
        }

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<NotificationDto?> CreateNotificationAsync(CreateNotificationDto dto, CancellationToken cancellationToken = default)
    {
        try
        {
            // Deduplication: prevent duplicate unread notifications with same title/message within 5 minutes
            var cutoff = DateTime.UtcNow.AddMinutes(-5);
            var isDuplicate = await _context.Notifications
                .AsNoTracking()
                .AnyAsync(n => n.UserId == dto.UserId &&
                               !n.IsRead &&
                               n.Title == dto.Title &&
                               n.CreatedAtUtc >= cutoff, cancellationToken);

            if (isDuplicate)
            {
                _logger.LogInformation("Skipping duplicate notification for user {UserId} with title '{Title}'", dto.UserId, dto.Title);
                return null;
            }

            var notification = new Notification
            {
                Id = Guid.NewGuid(),
                UserId = dto.UserId,
                Title = dto.Title.Trim(),
                Message = dto.Message.Trim(),
                Type = dto.Type,
                IsRead = false,
                RelatedWorkflowInstanceId = dto.RelatedWorkflowInstanceId,
                CreatedAtUtc = DateTime.UtcNow
            };

            _context.Notifications.Add(notification);
            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Created notification {NotificationId} for user {UserId}", notification.Id, dto.UserId);

            return new NotificationDto
            {
                Id = notification.Id,
                UserId = notification.UserId,
                Title = notification.Title,
                Message = notification.Message,
                Type = notification.Type,
                TypeName = notification.Type.ToString(),
                IsRead = notification.IsRead,
                RelatedWorkflowInstanceId = notification.RelatedWorkflowInstanceId,
                CreatedAtUtc = notification.CreatedAtUtc
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create notification for user {UserId}. Continuing operation.", dto.UserId);
            return null;
        }
    }
}
