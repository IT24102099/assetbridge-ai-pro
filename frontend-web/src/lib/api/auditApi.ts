import apiClient from '../api';
import { ApiResponse, PagedResponse } from '../../types/auth';
import {
  AuditEventDto,
  AuditFilterParametersDto
} from '../../types/workflow';

export const auditApi = {
  getAuditEvents: async (params?: AuditFilterParametersDto): Promise<ApiResponse<PagedResponse<AuditEventDto>>> => {
    const response = await apiClient.get<ApiResponse<PagedResponse<AuditEventDto>>>('/audit-events', { params });
    return response.data;
  },

  getWorkflowAuditEvents: async (workflowId: string): Promise<ApiResponse<AuditEventDto[]>> => {
    const response = await apiClient.get<ApiResponse<AuditEventDto[]>>(`/workflows/${workflowId}/audit`);
    return response.data;
  }
};
