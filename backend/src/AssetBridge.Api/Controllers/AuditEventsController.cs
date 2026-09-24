using AssetBridge.Application.Common.Interfaces;
using AssetBridge.Application.Common.Models;
using AssetBridge.Application.DTOs.Workflow;
using AssetBridge.Application.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AssetBridge.Api.Controllers;

[Authorize(Roles = "Manager,Admin")]
[Route("api/audit-events")]
public class AuditEventsController : BaseApiController
{
    private readonly IAuditService _auditService;
    private readonly ICurrentUserService _currentUserService;

    public AuditEventsController(IAuditService auditService, ICurrentUserService currentUserService)
    {
        _auditService = auditService;
        _currentUserService = currentUserService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<PagedResponse<AuditEventDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAuditEvents([FromQuery] AuditFilterParametersDto query)
    {
        var currentUserId = _currentUserService.UserId ?? throw new UnauthorizedAccessException("User is not authenticated.");
        var currentUserRole = _currentUserService.Role?.ToString() ?? string.Empty;
        var result = await _auditService.GetAuditEventsAsync(query, currentUserId, currentUserRole);
        return HandleSuccess(result, "System and workflow audit log records retrieved successfully.");
    }
}
