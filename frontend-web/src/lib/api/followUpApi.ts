import apiClient from '../api';
import { ApiResponse, PagedResponse } from '../../types/auth';
import {
  FollowUpTaskDto,
  CreateFollowUpTaskDto,
  UpdateFollowUpStatusDto,
  FollowUpFilterParametersDto
} from '../../types/workflow';

export const followUpApi = {
  createFollowUp: async (data: CreateFollowUpTaskDto): Promise<ApiResponse<FollowUpTaskDto>> => {
    const response = await apiClient.post<ApiResponse<FollowUpTaskDto>>('/follow-ups', data);
    return response.data;
  },

  getFollowUpById: async (id: string): Promise<ApiResponse<FollowUpTaskDto>> => {
    const response = await apiClient.get<ApiResponse<FollowUpTaskDto>>(`/follow-ups/${id}`);
    return response.data;
  },

  getFollowUps: async (params?: FollowUpFilterParametersDto): Promise<ApiResponse<PagedResponse<FollowUpTaskDto>>> => {
    const response = await apiClient.get<ApiResponse<PagedResponse<FollowUpTaskDto>>>('/follow-ups', { params });
    return response.data;
  },

  updateFollowUpStatus: async (id: string, data: UpdateFollowUpStatusDto): Promise<ApiResponse<FollowUpTaskDto>> => {
    const response = await apiClient.patch<ApiResponse<FollowUpTaskDto>>(`/follow-ups/${id}/status`, data);
    return response.data;
  }
};
