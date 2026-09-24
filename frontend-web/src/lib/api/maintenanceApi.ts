import apiClient from '../api';
import { ApiResponse, PagedResponse } from '../../types/auth';
import {
  MaintenanceJobResponseDto,
  CreateMaintenanceJobRequestDto,
  UpdateMaintenanceJobRequestDto,
  UpdateMaintenanceJobStatusRequestDto,
  MaintenanceJobQueryParametersDto,
  MaintenanceHistoryResponseDto,
  RecordMaintenanceHistoryRequestDto,
} from '../../types/maintenance';

export const maintenanceApi = {
  // Maintenance Jobs
  getJobs: async (
    params?: MaintenanceJobQueryParametersDto
  ): Promise<ApiResponse<PagedResponse<MaintenanceJobResponseDto>>> => {
    const response = await apiClient.get<ApiResponse<PagedResponse<MaintenanceJobResponseDto>>>(
      '/maintenance-jobs',
      { params }
    );
    return response.data;
  },

  getJobById: async (id: string): Promise<ApiResponse<MaintenanceJobResponseDto>> => {
    const response = await apiClient.get<ApiResponse<MaintenanceJobResponseDto>>(
      `/maintenance-jobs/${id}`
    );
    return response.data;
  },

  createJob: async (
    data: CreateMaintenanceJobRequestDto
  ): Promise<ApiResponse<MaintenanceJobResponseDto>> => {
    const response = await apiClient.post<ApiResponse<MaintenanceJobResponseDto>>(
      '/maintenance-jobs',
      data
    );
    return response.data;
  },

  updateJob: async (
    id: string,
    data: UpdateMaintenanceJobRequestDto
  ): Promise<ApiResponse<MaintenanceJobResponseDto>> => {
    const response = await apiClient.put<ApiResponse<MaintenanceJobResponseDto>>(
      `/maintenance-jobs/${id}`,
      data
    );
    return response.data;
  },

  updateJobStatus: async (
    id: string,
    data: UpdateMaintenanceJobStatusRequestDto
  ): Promise<ApiResponse<MaintenanceJobResponseDto>> => {
    const response = await apiClient.patch<ApiResponse<MaintenanceJobResponseDto>>(
      `/maintenance-jobs/${id}/status`,
      data
    );
    return response.data;
  },

  // Maintenance History per Asset
  getHistory: async (
    assetId: string
  ): Promise<ApiResponse<MaintenanceHistoryResponseDto[]>> => {
    const response = await apiClient.get<ApiResponse<MaintenanceHistoryResponseDto[]>>(
      `/assets/${assetId}/maintenance-history`
    );
    return response.data;
  },

  recordHistory: async (
    assetId: string,
    data: RecordMaintenanceHistoryRequestDto
  ): Promise<ApiResponse<MaintenanceHistoryResponseDto>> => {
    const response = await apiClient.post<ApiResponse<MaintenanceHistoryResponseDto>>(
      `/assets/${assetId}/maintenance-history`,
      data
    );
    return response.data;
  },
};
