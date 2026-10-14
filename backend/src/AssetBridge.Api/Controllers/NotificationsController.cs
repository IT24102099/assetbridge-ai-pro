using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using AssetBridge.Application.Common.Interfaces;
using AssetBridge.Application.Common.Models;
using AssetBridge.Application.DTOs.Notifications;
using AssetBridge.Application.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace AssetBridge.Api.Controllers;

[Authorize]
[Route("api/notifications")]
public class NotificationsController : BaseApiController
{
    private readonly INotificationService _notificationService;
    private readonly ICurrentUserService _currentUserService;

    public NotificationsController(
        INotificationService notificationService,
        ICurrentUserService currentUserService)
    {
        _notificationService = notificationService;
        _currentUserService = currentUserService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<NotificationDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetNotifications([FromQuery] int limit = 20, CancellationToken cancellationToken = default)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
        {
            return Unauthorized(ApiResponse<object>.FailureResult("User is not authenticated."));
        }

        var notifications = await _notificationService.GetUserNotificationsAsync(userId.Value, limit, cancellationToken);
        return HandleSuccess(notifications, "Notifications retrieved successfully.");
    }

    [HttpGet("unread-count")]
    [ProducesResponseType(typeof(ApiResponse<int>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetUnreadCount(CancellationToken cancellationToken = default)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
        {
            return Unauthorized(ApiResponse<object>.FailureResult("User is not authenticated."));
        }

        var count = await _notificationService.GetUnreadCountAsync(userId.Value, cancellationToken);
        return HandleSuccess(count, "Unread notification count retrieved successfully.");
    }

    [HttpPatch("{id:guid}/read")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> MarkAsRead(Guid id, CancellationToken cancellationToken = default)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
        {
            return Unauthorized(ApiResponse<object>.FailureResult("User is not authenticated."));
        }

        var success = await _notificationService.MarkAsReadAsync(id, userId.Value, cancellationToken);
        if (!success)
        {
            return NotFound(ApiResponse<object>.FailureResult("Notification not found or access denied."));
        }

        return HandleSuccess(true, "Notification marked as read.");
    }

    [HttpPatch("read-all")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    public async Task<IActionResult> MarkAllAsRead(CancellationToken cancellationToken = default)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
        {
            return Unauthorized(ApiResponse<object>.FailureResult("User is not authenticated."));
        }

        await _notificationService.MarkAllAsReadAsync(userId.Value, cancellationToken);
        return HandleSuccess(true, "All notifications marked as read.");
    }
}
