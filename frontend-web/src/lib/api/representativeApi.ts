import apiClient from '../api';
import { ApiResponse, PagedResponse } from '../../types/auth';
import {
  RepresentativeResponseDto,
  CreateRepresentativeRequestDto,
  UpdateRepresentativeRequestDto,
  UpdateVerificationRequestDto,
  RepresentativeQueryParametersDto,
} from '../../types/representative';

export const representativeApi = {
  getRepresentatives: async (
    params?: RepresentativeQueryParametersDto
  ): Promise<ApiResponse<PagedResponse<RepresentativeResponseDto>>> => {
    const response = await apiClient.get<ApiResponse<PagedResponse<RepresentativeResponseDto>>>(
      '/representatives',
      { params }
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
    const response = await apiClient.patch<ApiResponse<RepresentativeResponseDto>>(
      `/representatives/${id}/verification`,
      data
    );
    return response.data;
  },

  deleteRepresentative: async (id: string): Promise<ApiResponse<boolean>> => {
    const response = await apiClient.delete<ApiResponse<boolean>>(`/representatives/${id}`);
    return response.data;
  },
};
