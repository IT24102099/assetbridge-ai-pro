import apiClient from '../api';
import { ApiResponse, PagedResponse } from '../../types/auth';
import {
  InspectionResponseDto,
  InspectionFindingResponseDto,
  CreateInspectionRequestDto,
  UpdateInspectionRequestDto,
  UpdateInspectionStatusRequestDto,
  CreateInspectionFindingRequestDto,
  UpdateInspectionFindingRequestDto,
  InspectionQueryParametersDto,
} from '../../types/inspection';

export const inspectionApi = {
  // Inspections
  getInspections: async (
    params?: InspectionQueryParametersDto
  ): Promise<ApiResponse<PagedResponse<InspectionResponseDto>>> => {
    const response = await apiClient.get<ApiResponse<PagedResponse<InspectionResponseDto>>>(
      '/inspections',
      { params }
    );
    return response.data;
  },

  getInspectionById: async (id: string): Promise<ApiResponse<InspectionResponseDto>> => {
    const response = await apiClient.get<ApiResponse<InspectionResponseDto>>(`/inspections/${id}`);
    return response.data;
  },

  createInspection: async (
    data: CreateInspectionRequestDto
  ): Promise<ApiResponse<InspectionResponseDto>> => {
    const response = await apiClient.post<ApiResponse<InspectionResponseDto>>('/inspections', data);
    return response.data;
  },

  updateInspection: async (
    id: string,
    data: UpdateInspectionRequestDto
  ): Promise<ApiResponse<InspectionResponseDto>> => {
    const response = await apiClient.put<ApiResponse<InspectionResponseDto>>(`/inspections/${id}`, data);
    return response.data;
  },

  updateInspectionStatus: async (
    id: string,
    data: UpdateInspectionStatusRequestDto
  ): Promise<ApiResponse<InspectionResponseDto>> => {
    const response = await apiClient.patch<ApiResponse<InspectionResponseDto>>(
      `/inspections/${id}/status`,
      data
    );
    return response.data;
  },

  // Findings
  getFindings: async (
    inspectionId: string
  ): Promise<ApiResponse<InspectionFindingResponseDto[]>> => {
    const response = await apiClient.get<ApiResponse<InspectionFindingResponseDto[]>>(
      `/inspections/${inspectionId}/findings`
    );
    return response.data;
  },

  addFinding: async (
    inspectionId: string,
    data: CreateInspectionFindingRequestDto
  ): Promise<ApiResponse<InspectionFindingResponseDto>> => {
    const response = await apiClient.post<ApiResponse<InspectionFindingResponseDto>>(
      `/inspections/${inspectionId}/findings`,
      data
    );
    return response.data;
  },

  updateFinding: async (
    inspectionId: string,
    findingId: string,
    data: UpdateInspectionFindingRequestDto
  ): Promise<ApiResponse<InspectionFindingResponseDto>> => {
    const response = await apiClient.put<ApiResponse<InspectionFindingResponseDto>>(
      `/inspections/${inspectionId}/findings/${findingId}`,
      data
    );
    return response.data;
  },

  removeFinding: async (
    inspectionId: string,
    findingId: string
  ): Promise<ApiResponse<boolean>> => {
    const response = await apiClient.delete<ApiResponse<boolean>>(
      `/inspections/${inspectionId}/findings/${findingId}`
    );
    return response.data;
  },
};
