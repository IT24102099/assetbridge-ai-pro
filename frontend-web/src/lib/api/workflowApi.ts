import apiClient from '../api';
import { ApiResponse, PagedResponse } from '../../types/auth';
import {
  WorkflowInstanceDto,
  CreateWorkflowRequestDto,
  TransitionWorkflowRequestDto,
  FailWorkflowRequestDto,
  WorkflowFilterParametersDto,
  WorkflowTimelineDto,
  ApprovalRequestDto,
  CreateApprovalRequestDto,
  ApprovalDecisionRequestDto,
  RevisionRequestDto,
  AgentRunDto,
  CreateAgentRunDto,
  ToolExecutionDto,
  CreateToolExecutionDto,
  WorkflowDashboardMetricsDto,
  FollowUpTaskDto,
  CreateFollowUpTaskDto
} from '../../types/workflow';

export const workflowApi = {
  // Workflow Lifecycle
  createWorkflow: async (data: CreateWorkflowRequestDto): Promise<ApiResponse<WorkflowInstanceDto>> => {
    const response = await apiClient.post<ApiResponse<WorkflowInstanceDto>>('/workflows', data);
    return response.data;
  },

  getWorkflowById: async (id: string): Promise<ApiResponse<WorkflowInstanceDto>> => {
    const response = await apiClient.get<ApiResponse<WorkflowInstanceDto>>(`/workflows/${id}`);
    return response.data;
  },

  getWorkflows: async (params?: WorkflowFilterParametersDto): Promise<ApiResponse<PagedResponse<WorkflowInstanceDto>>> => {
    const response = await apiClient.get<ApiResponse<PagedResponse<WorkflowInstanceDto>>>('/workflows', { params });
    return response.data;
  },

  getWorkflowTimeline: async (id: string): Promise<ApiResponse<WorkflowTimelineDto>> => {
    const response = await apiClient.get<ApiResponse<WorkflowTimelineDto>>(`/workflows/${id}/timeline`);
    return response.data;
  },

  transitionWorkflow: async (id: string, data: TransitionWorkflowRequestDto): Promise<ApiResponse<WorkflowInstanceDto>> => {
    const response = await apiClient.post<ApiResponse<WorkflowInstanceDto>>(`/workflows/${id}/transition`, data);
    return response.data;
  },

  failWorkflow: async (id: string, data: FailWorkflowRequestDto): Promise<ApiResponse<WorkflowInstanceDto>> => {
    const response = await apiClient.post<ApiResponse<WorkflowInstanceDto>>(`/workflows/${id}/fail`, data);
    return response.data;
  },

  // Human Governance & Approvals
  createApprovalRequest: async (id: string, data: CreateApprovalRequestDto): Promise<ApiResponse<ApprovalRequestDto>> => {
    const response = await apiClient.post<ApiResponse<ApprovalRequestDto>>(`/workflows/${id}/approval-request`, data);
    return response.data;
  },

  approveWorkflow: async (id: string, data: ApprovalDecisionRequestDto): Promise<ApiResponse<ApprovalRequestDto>> => {
    const response = await apiClient.post<ApiResponse<ApprovalRequestDto>>(`/workflows/${id}/approve`, data);
    return response.data;
  },

  rejectWorkflow: async (id: string, data: ApprovalDecisionRequestDto): Promise<ApiResponse<ApprovalRequestDto>> => {
    const response = await apiClient.post<ApiResponse<ApprovalRequestDto>>(`/workflows/${id}/reject`, data);
    return response.data;
  },

  requestRevision: async (id: string, data: RevisionRequestDto): Promise<ApiResponse<ApprovalRequestDto>> => {
    const response = await apiClient.post<ApiResponse<ApprovalRequestDto>>(`/workflows/${id}/request-revision`, data);
    return response.data;
  },

  // Telemetry & Agent Executions
  getAgentRuns: async (id: string): Promise<ApiResponse<AgentRunDto[]>> => {
    const response = await apiClient.get<ApiResponse<AgentRunDto[]>>(`/workflows/${id}/agent-runs`);
    return response.data;
  },

  recordAgentRun: async (id: string, data: CreateAgentRunDto): Promise<ApiResponse<AgentRunDto>> => {
    const response = await apiClient.post<ApiResponse<AgentRunDto>>(`/workflows/${id}/agent-runs`, data);
    return response.data;
  },

  recordToolExecution: async (id: string, agentRunId: string, data: CreateToolExecutionDto): Promise<ApiResponse<ToolExecutionDto>> => {
    const response = await apiClient.post<ApiResponse<ToolExecutionDto>>(`/workflows/${id}/agent-runs/${agentRunId}/tool-executions`, data);
    return response.data;
  },

  // Workflow Follow-ups
  getWorkflowFollowUps: async (id: string): Promise<ApiResponse<FollowUpTaskDto[]>> => {
    const response = await apiClient.get<ApiResponse<FollowUpTaskDto[]>>(`/workflows/${id}/follow-ups`);
    return response.data;
  },

  createWorkflowFollowUp: async (id: string, data: CreateFollowUpTaskDto): Promise<ApiResponse<FollowUpTaskDto>> => {
    const response = await apiClient.post<ApiResponse<FollowUpTaskDto>>(`/workflows/${id}/follow-ups`, data);
    return response.data;
  },

  // Dashboard Metrics
  getDashboardMetrics: async (): Promise<ApiResponse<WorkflowDashboardMetricsDto>> => {
    const response = await apiClient.get<ApiResponse<WorkflowDashboardMetricsDto>>('/workflows/dashboard/metrics');
    return response.data;
  }
};
