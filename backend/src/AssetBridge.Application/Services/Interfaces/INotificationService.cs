using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using AssetBridge.Application.DTOs.Notifications;

namespace AssetBridge.Application.Services.Interfaces;

public interface INotificationService
{
    Task<List<NotificationDto>> GetUserNotificationsAsync(Guid userId, int limit = 20, CancellationToken cancellationToken = default);
    Task<int> GetUnreadCountAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<bool> MarkAsReadAsync(Guid notificationId, Guid userId, CancellationToken cancellationToken = default);
    Task<bool> MarkAllAsReadAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<NotificationDto?> CreateNotificationAsync(CreateNotificationDto dto, CancellationToken cancellationToken = default);
}
