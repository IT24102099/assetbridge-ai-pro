using AssetBridge.Application.Common.Models;
using AssetBridge.Application.DTOs.Workflow;
using AssetBridge.Domain.Enums;

namespace AssetBridge.Application.Services.Interfaces;

public interface IWorkflowService
{
    // Workflow lifecycle & state machine
    Task<WorkflowInstanceDto> CreateWorkflowAsync(CreateWorkflowRequestDto dto, Guid currentUserId);
    Task<WorkflowInstanceDto?> GetWorkflowByIdAsync(Guid id, Guid currentUserId, string currentUserRole);
    Task<PagedResponse<WorkflowInstanceDto>> GetWorkflowsAsync(WorkflowFilterParametersDto parameters, Guid currentUserId, string currentUserRole);
    Task<WorkflowTimelineDto?> GetWorkflowTimelineAsync(Guid workflowId, Guid currentUserId, string currentUserRole);
    Task<WorkflowInstanceDto> TransitionWorkflowAsync(Guid workflowId, TransitionWorkflowRequestDto dto, Guid currentUserId, string currentUserRole);
    Task<WorkflowInstanceDto> FailWorkflowAsync(Guid workflowId, FailWorkflowRequestDto dto, Guid currentUserId, string currentUserRole);

    // Human-in-the-Loop Governance & Approvals
    Task<ApprovalRequestDto> CreateApprovalRequestAsync(Guid workflowId, CreateApprovalRequestDto dto, Guid currentUserId, string currentUserRole);
    Task<ApprovalRequestDto> ApproveWorkflowAsync(Guid workflowId, ApprovalDecisionRequestDto dto, Guid currentUserId, string currentUserRole);
    Task<ApprovalRequestDto> RejectWorkflowAsync(Guid workflowId, ApprovalDecisionRequestDto dto, Guid currentUserId, string currentUserRole);
    Task<ApprovalRequestDto> RequestRevisionAsync(Guid workflowId, RevisionRequestDto dto, Guid currentUserId, string currentUserRole);

    // Agentic AI telemetry persistence
    Task<AgentRunDto> RecordAgentRunAsync(Guid workflowId, CreateAgentRunDto dto, Guid currentUserId);
    Task<AgentRunDto> CompleteAgentRunAsync(Guid workflowId, Guid agentRunId, CompleteAgentRunDto dto, Guid currentUserId);
    Task<ToolExecutionDto> RecordToolExecutionAsync(Guid workflowId, Guid agentRunId, CreateToolExecutionDto dto, Guid currentUserId);
    Task<List<AgentRunDto>> GetAgentRunsAsync(Guid workflowId, Guid currentUserId, string currentUserRole);

    // Dashboard metrics
    Task<WorkflowDashboardMetricsDto> GetDashboardMetricsAsync(Guid currentUserId, string currentUserRole);
}
