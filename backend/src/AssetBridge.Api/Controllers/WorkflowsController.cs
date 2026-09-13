using AssetBridge.Application.Common.Interfaces;
using AssetBridge.Application.Common.Models;
using AssetBridge.Application.DTOs.Workflow;
using AssetBridge.Application.Services.Interfaces;
using AssetBridge.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AssetBridge.Api.Controllers;

[Authorize]
public class WorkflowsController : BaseApiController
{
    private readonly IWorkflowService _workflowService;
    private readonly IAuditService _auditService;
    private readonly IFollowUpService _followUpService;
    private readonly ICurrentUserService _currentUserService;

    public WorkflowsController(
        IWorkflowService workflowService,
        IAuditService auditService,
        IFollowUpService followUpService,
        ICurrentUserService currentUserService)
    {
        _workflowService = workflowService;
        _auditService = auditService;
        _followUpService = followUpService;
        _currentUserService = currentUserService;
    }

    #region Workflow Lifecycle & State Machine

    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<WorkflowInstanceDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> CreateWorkflow([FromBody] CreateWorkflowRequestDto request)
    {
        var currentUserId = _currentUserService.UserId ?? throw new UnauthorizedAccessException("User is not authenticated.");
        var result = await _workflowService.CreateWorkflowAsync(request, currentUserId);
        return HandleCreated($"/api/workflows/{result.Id}", result, "Workflow instance initiated successfully.");
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<WorkflowInstanceDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetWorkflowById(Guid id)
    {
        var currentUserId = _currentUserService.UserId ?? throw new UnauthorizedAccessException("User is not authenticated.");
        var currentUserRole = _currentUserService.Role?.ToString() ?? string.Empty;
        var result = await _workflowService.GetWorkflowByIdAsync(id, currentUserId, currentUserRole);

        if (result == null)
            return NotFound(ApiResponse<object>.FailureResult($"Workflow with ID '{id}' was not found."));

        return HandleSuccess(result, "Workflow instance retrieved successfully.");
    }

    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<PagedResponse<WorkflowInstanceDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetWorkflows([FromQuery] WorkflowFilterParametersDto query)
    {
        var currentUserId = _currentUserService.UserId ?? throw new UnauthorizedAccessException("User is not authenticated.");
        var currentUserRole = _currentUserService.Role?.ToString() ?? string.Empty;
        var result = await _workflowService.GetWorkflowsAsync(query, currentUserId, currentUserRole);
        return HandleSuccess(result, "Workflows retrieved successfully.");
    }

    [HttpGet("{id:guid}/timeline")]
    [ProducesResponseType(typeof(ApiResponse<WorkflowTimelineDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetWorkflowTimeline(Guid id)
    {
        var currentUserId = _currentUserService.UserId ?? throw new UnauthorizedAccessException("User is not authenticated.");
        var currentUserRole = _currentUserService.Role?.ToString() ?? string.Empty;
        var result = await _workflowService.GetWorkflowTimelineAsync(id, currentUserId, currentUserRole);

        if (result == null)
            return NotFound(ApiResponse<object>.FailureResult($"Workflow with ID '{id}' was not found."));

        return HandleSuccess(result, "Workflow timeline retrieved successfully.");
    }

    [HttpPost("{id:guid}/transition")]
    [ProducesResponseType(typeof(ApiResponse<WorkflowInstanceDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> TransitionWorkflow(Guid id, [FromBody] TransitionWorkflowRequestDto request)
    {
        var currentUserId = _currentUserService.UserId ?? throw new UnauthorizedAccessException("User is not authenticated.");
        var currentUserRole = _currentUserService.Role?.ToString() ?? string.Empty;
        var result = await _workflowService.TransitionWorkflowAsync(id, request, currentUserId, currentUserRole);
        return HandleSuccess(result, $"Workflow transitioned to {request.TargetState} successfully.");
    }

    [HttpPost("{id:guid}/fail")]
    [ProducesResponseType(typeof(ApiResponse<WorkflowInstanceDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> FailWorkflow(Guid id, [FromBody] FailWorkflowRequestDto request)
    {
        var currentUserId = _currentUserService.UserId ?? throw new UnauthorizedAccessException("User is not authenticated.");
        var currentUserRole = _currentUserService.Role?.ToString() ?? string.Empty;
        var result = await _workflowService.FailWorkflowAsync(id, request, currentUserId, currentUserRole);
        return HandleSuccess(result, "Workflow state set to Failed.");
    }

    #endregion

    #region Human-in-the-Loop Governance & Approvals

    [HttpPost("{id:guid}/approval-request")]
    [ProducesResponseType(typeof(ApiResponse<ApprovalRequestDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateApprovalRequest(Guid id, [FromBody] CreateApprovalRequestDto request)
    {
        var currentUserId = _currentUserService.UserId ?? throw new UnauthorizedAccessException("User is not authenticated.");
        var currentUserRole = _currentUserService.Role?.ToString() ?? string.Empty;
        var result = await _workflowService.CreateApprovalRequestAsync(id, request, currentUserId, currentUserRole);
        return HandleCreated($"/api/workflows/{id}/approval-request", result, "Approval request submitted successfully.");
    }

    [HttpPost("{id:guid}/approve")]
    [Authorize(Roles = "Manager,Admin")]
    [ProducesResponseType(typeof(ApiResponse<ApprovalRequestDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> ApproveWorkflow(Guid id, [FromBody] ApprovalDecisionRequestDto request)
    {
        var currentUserId = _currentUserService.UserId ?? throw new UnauthorizedAccessException("User is not authenticated.");
        var currentUserRole = _currentUserService.Role?.ToString() ?? string.Empty;
        var result = await _workflowService.ApproveWorkflowAsync(id, request, currentUserId, currentUserRole);
        return HandleSuccess(result, "Workflow approved by authorized manager.");
    }

    [HttpPost("{id:guid}/reject")]
    [Authorize(Roles = "Manager,Admin")]
    [ProducesResponseType(typeof(ApiResponse<ApprovalRequestDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> RejectWorkflow(Guid id, [FromBody] ApprovalDecisionRequestDto request)
    {
        var currentUserId = _currentUserService.UserId ?? throw new UnauthorizedAccessException("User is not authenticated.");
        var currentUserRole = _currentUserService.Role?.ToString() ?? string.Empty;
        var result = await _workflowService.RejectWorkflowAsync(id, request, currentUserId, currentUserRole);
        return HandleSuccess(result, "Workflow proposal rejected.");
    }

    [HttpPost("{id:guid}/request-revision")]
    [Authorize(Roles = "Manager,Admin")]
    [ProducesResponseType(typeof(ApiResponse<ApprovalRequestDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> RequestRevision(Guid id, [FromBody] RevisionRequestDto request)
    {
        var currentUserId = _currentUserService.UserId ?? throw new UnauthorizedAccessException("User is not authenticated.");
        var currentUserRole = _currentUserService.Role?.ToString() ?? string.Empty;
        var result = await _workflowService.RequestRevisionAsync(id, request, currentUserId, currentUserRole);
        return HandleSuccess(result, "Revision requested on workflow proposal.");
    }

    #endregion

    #region Telemetry, Audit & Follow-Ups

    [HttpGet("{id:guid}/audit")]
    [ProducesResponseType(typeof(ApiResponse<List<AuditEventDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetWorkflowAuditEvents(Guid id)
    {
        var currentUserId = _currentUserService.UserId ?? throw new UnauthorizedAccessException("User is not authenticated.");
        var currentUserRole = _currentUserService.Role?.ToString() ?? string.Empty;
        var result = await _auditService.GetWorkflowAuditEventsAsync(id, currentUserId, currentUserRole);
        return HandleSuccess(result, "Workflow audit records retrieved.");
    }

    [HttpGet("{id:guid}/agent-runs")]
    [ProducesResponseType(typeof(ApiResponse<List<AgentRunDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAgentRuns(Guid id)
    {
        var currentUserId = _currentUserService.UserId ?? throw new UnauthorizedAccessException("User is not authenticated.");
        var currentUserRole = _currentUserService.Role?.ToString() ?? string.Empty;
        var result = await _workflowService.GetAgentRunsAsync(id, currentUserId, currentUserRole);
        return HandleSuccess(result, "Agent execution traces retrieved.");
    }

    [HttpPost("{id:guid}/agent-runs")]
    [ProducesResponseType(typeof(ApiResponse<AgentRunDto>), StatusCodes.Status201Created)]
    public async Task<IActionResult> RecordAgentRun(Guid id, [FromBody] CreateAgentRunDto request)
    {
        var currentUserId = _currentUserService.UserId ?? throw new UnauthorizedAccessException("User is not authenticated.");
        var result = await _workflowService.RecordAgentRunAsync(id, request, currentUserId);
        return HandleCreated($"/api/workflows/{id}/agent-runs/{result.Id}", result, "Agent run recorded.");
    }

    [HttpPost("{id:guid}/agent-runs/{agentRunId:guid}/tool-executions")]
    [ProducesResponseType(typeof(ApiResponse<ToolExecutionDto>), StatusCodes.Status201Created)]
    public async Task<IActionResult> RecordToolExecution(Guid id, Guid agentRunId, [FromBody] CreateToolExecutionDto request)
    {
        var currentUserId = _currentUserService.UserId ?? throw new UnauthorizedAccessException("User is not authenticated.");
        var result = await _workflowService.RecordToolExecutionAsync(id, agentRunId, request, currentUserId);
        return HandleCreated($"/api/workflows/{id}/agent-runs/{agentRunId}/tool-executions/{result.Id}", result, "Tool execution logged.");
    }

    [HttpGet("{id:guid}/follow-ups")]
    [ProducesResponseType(typeof(ApiResponse<List<FollowUpTaskDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetWorkflowFollowUps(Guid id)
    {
        var currentUserId = _currentUserService.UserId ?? throw new UnauthorizedAccessException("User is not authenticated.");
        var currentUserRole = _currentUserService.Role?.ToString() ?? string.Empty;
        var result = await _followUpService.GetWorkflowFollowUpsAsync(id, currentUserId, currentUserRole);
        return HandleSuccess(result, "Workflow continuity follow-up tasks retrieved.");
    }

    [HttpPost("{id:guid}/follow-ups")]
    [Authorize(Roles = "Manager,Admin,Representative")]
    [ProducesResponseType(typeof(ApiResponse<FollowUpTaskDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateWorkflowFollowUp(Guid id, [FromBody] CreateFollowUpTaskDto request)
    {
        var currentUserId = _currentUserService.UserId ?? throw new UnauthorizedAccessException("User is not authenticated.");
        var currentUserRole = _currentUserService.Role?.ToString() ?? string.Empty;
        request.WorkflowInstanceId = id;
        var result = await _followUpService.CreateFollowUpTaskAsync(request, currentUserId, currentUserRole);
        return HandleCreated($"/api/workflows/{id}/follow-ups/{result.Id}", result, "Workflow continuity follow-up task scheduled successfully.");
    }

    [HttpGet("dashboard/metrics")]
    [Authorize(Roles = "Manager,Admin")]
    [ProducesResponseType(typeof(ApiResponse<WorkflowDashboardMetricsDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetDashboardMetrics()
    {
        var currentUserId = _currentUserService.UserId ?? throw new UnauthorizedAccessException("User is not authenticated.");
        var currentUserRole = _currentUserService.Role?.ToString() ?? string.Empty;
        var result = await _workflowService.GetDashboardMetricsAsync(currentUserId, currentUserRole);
        return HandleSuccess(result, "Dashboard metrics retrieved successfully.");
    }

    #endregion
}
