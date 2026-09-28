import apiClient from '../api';
import { ApiResponse, PagedResponse } from '../../types/auth';
import {
  IncidentResponseDto,
  CreateIncidentRequestDto,
  UpdateIncidentRequestDto,
  UpdateIncidentStatusRequestDto,
  AddIncidentEvidenceRequestDto,
  IncidentEvidenceResponseDto,
  IncidentQueryParametersDto,
  EvidenceType,
} from '../../types/incident';

export const incidentApi = {
  getIncidents: async (params?: IncidentQueryParametersDto): Promise<ApiResponse<PagedResponse<IncidentResponseDto>>> => {
    const response = await apiClient.get<ApiResponse<PagedResponse<IncidentResponseDto>>>('/incidents', { params });
    return response.data;
  },

  getIncidentById: async (id: string): Promise<ApiResponse<IncidentResponseDto>> => {
    const response = await apiClient.get<ApiResponse<IncidentResponseDto>>(`/incidents/${id}`);
    return response.data;
  },

  createIncident: async (data: CreateIncidentRequestDto): Promise<ApiResponse<IncidentResponseDto>> => {
    const response = await apiClient.post<ApiResponse<IncidentResponseDto>>('/incidents', data);
    return response.data;
  },

  updateIncident: async (id: string, data: UpdateIncidentRequestDto): Promise<ApiResponse<IncidentResponseDto>> => {
    const response = await apiClient.put<ApiResponse<IncidentResponseDto>>(`/incidents/${id}`, data);
    return response.data;
  },

  updateStatus: async (id: string, data: UpdateIncidentStatusRequestDto): Promise<ApiResponse<IncidentResponseDto>> => {
    const response = await apiClient.patch<ApiResponse<IncidentResponseDto>>(`/incidents/${id}/status`, data);
    return response.data;
  },

  addEvidence: async (id: string, data: AddIncidentEvidenceRequestDto): Promise<ApiResponse<IncidentEvidenceResponseDto>> => {
    const response = await apiClient.post<ApiResponse<IncidentEvidenceResponseDto>>(`/incidents/${id}/evidence`, data);
    return response.data;
  },

  uploadEvidence: async (id: string, file: File, evidenceType: EvidenceType = 'Photo', caption?: string): Promise<ApiResponse<IncidentEvidenceResponseDto>> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('evidenceType', evidenceType);
    if (caption) {
      formData.append('caption', caption);
    }
    const response = await apiClient.post<ApiResponse<IncidentEvidenceResponseDto>>(`/incidents/${id}/evidence/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getEvidence: async (id: string): Promise<ApiResponse<IncidentEvidenceResponseDto[]>> => {
    const response = await apiClient.get<ApiResponse<IncidentEvidenceResponseDto[]>>(`/incidents/${id}/evidence`);
    return response.data;
  },

  deleteEvidence: async (id: string, evidenceId: string): Promise<ApiResponse<boolean>> => {
    const response = await apiClient.delete<ApiResponse<boolean>>(`/incidents/${id}/evidence/${evidenceId}`);
    return response.data;
  },
};
