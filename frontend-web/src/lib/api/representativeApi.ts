import apiClient from '../api';
import { ApiResponse, PagedResponse } from '../../types/auth';
import {
  RepresentativeResponseDto,
  CreateRepresentativeRequestDto,
  UpdateRepresentativeRequestDto,
  UpdateVerificationRequestDto,
  RepresentativeQueryParametersDto,
  RepresentativeDocumentResponseDto,
  ReviewRepresentativeDocumentRequestDto
} from '../../types/representative';

export const representativeApi = {
  getRepresentatives: async (
    params?: RepresentativeQueryParametersDto
  ): Promise<ApiResponse<PagedResponse<RepresentativeResponseDto>>> => {
    const queryParams: any = { ...params };
    if (params?.searchTerm) {
      queryParams.search = params.searchTerm;
    }
    if (params?.status) {
      queryParams.status = params.status;
    }
    const response = await apiClient.get<ApiResponse<PagedResponse<RepresentativeResponseDto>>>(
      '/representatives',
      { params: queryParams }
    );
    return response.data;
  },

  getRepresentativeById: async (id: string): Promise<ApiResponse<RepresentativeResponseDto>> => {
    const response = await apiClient.get<ApiResponse<RepresentativeResponseDto>>(`/representatives/${id}`);
    return response.data;
  },

  getCurrentProfile: async (): Promise<ApiResponse<RepresentativeResponseDto>> => {
    const response = await apiClient.get<ApiResponse<RepresentativeResponseDto>>('/representatives/me');
    return response.data;
  },

  createRepresentative: async (
    data: CreateRepresentativeRequestDto
  ): Promise<ApiResponse<RepresentativeResponseDto>> => {
    const response = await apiClient.post<ApiResponse<RepresentativeResponseDto>>('/representatives', data);
    return response.data;
  },

  updateRepresentative: async (
    id: string,
    data: UpdateRepresentativeRequestDto
  ): Promise<ApiResponse<RepresentativeResponseDto>> => {
    const response = await apiClient.put<ApiResponse<RepresentativeResponseDto>>(`/representatives/${id}`, data);
    return response.data;
  },

  updateVerification: async (
    id: string,
    data: UpdateVerificationRequestDto
  ): Promise<ApiResponse<RepresentativeResponseDto>> => {
    const statusVal = data.verificationStatus || data.status || 'Pending';
    const notesVal = data.verificationNotes || data.notes;
    const payload = {
      verificationStatus: statusVal,
      status: statusVal,
      verificationNotes: notesVal,
      notes: notesVal,
    };
    const response = await apiClient.patch<ApiResponse<RepresentativeResponseDto>>(
      `/representatives/${id}/verification`,
      payload
    );
    return response.data;
  },

  deleteRepresentative: async (id: string): Promise<ApiResponse<boolean>> => {
    const response = await apiClient.delete<ApiResponse<boolean>>(`/representatives/${id}`);
    return response.data;
  },

  uploadDocument: async (
    id: string,
    file: File,
    documentType: string
  ): Promise<ApiResponse<RepresentativeDocumentResponseDto>> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);
    const response = await apiClient.post<ApiResponse<RepresentativeDocumentResponseDto>>(
      `/representatives/${id}/documents`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return response.data;
  },

  getDocuments: async (id: string): Promise<ApiResponse<RepresentativeDocumentResponseDto[]>> => {
    const response = await apiClient.get<ApiResponse<RepresentativeDocumentResponseDto[]>>(
      `/representatives/${id}/documents`
    );
    return response.data;
  },

  reviewDocument: async (
    id: string,
    documentId: string,
    data: ReviewRepresentativeDocumentRequestDto
  ): Promise<ApiResponse<RepresentativeDocumentResponseDto>> => {
    const response = await apiClient.patch<ApiResponse<RepresentativeDocumentResponseDto>>(
      `/representatives/${id}/documents/${documentId}/review`,
      data
    );
    return response.data;
  },
};
