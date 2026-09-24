import apiClient from '../api';
import { ApiResponse, PagedResponse } from '../../types/auth';
import {
  ServiceProviderResponseDto,
  CreateServiceProviderRequestDto,
  UpdateServiceProviderRequestDto,
  ProviderSkillResponseDto,
  AddProviderSkillRequestDto,
  ProviderAvailabilityResponseDto,
  AddProviderAvailabilityRequestDto,
  UpdateProviderAvailabilityRequestDto,
  ProviderHistoryResponseDto,
  AddProviderHistoryRequestDto,
  ProviderMatchingRequestDto,
  ProviderMatchingResultDto,
  ProviderQueryParametersDto,
} from '../../types/provider';
import { UpdateVerificationRequestDto } from '../../types/representative';

export const providerApi = {
  getProviders: async (
    params?: ProviderQueryParametersDto
  ): Promise<ApiResponse<PagedResponse<ServiceProviderResponseDto>>> => {
    const response = await apiClient.get<ApiResponse<PagedResponse<ServiceProviderResponseDto>>>('/providers', {
      params,
    });
    return response.data;
  },

  getProviderById: async (id: string): Promise<ApiResponse<ServiceProviderResponseDto>> => {
    const response = await apiClient.get<ApiResponse<ServiceProviderResponseDto>>(`/providers/${id}`);
    return response.data;
  },

  getCurrentProfile: async (): Promise<ApiResponse<ServiceProviderResponseDto>> => {
    const response = await apiClient.get<ApiResponse<ServiceProviderResponseDto>>('/providers/me');
    return response.data;
  },

  createProvider: async (
    data: CreateServiceProviderRequestDto
  ): Promise<ApiResponse<ServiceProviderResponseDto>> => {
    const response = await apiClient.post<ApiResponse<ServiceProviderResponseDto>>('/providers', data);
    return response.data;
  },

  updateProvider: async (
    id: string,
    data: UpdateServiceProviderRequestDto
  ): Promise<ApiResponse<ServiceProviderResponseDto>> => {
    const response = await apiClient.put<ApiResponse<ServiceProviderResponseDto>>(`/providers/${id}`, data);
    return response.data;
  },

  updateVerification: async (
    id: string,
    data: UpdateVerificationRequestDto
  ): Promise<ApiResponse<ServiceProviderResponseDto>> => {
    const response = await apiClient.patch<ApiResponse<ServiceProviderResponseDto>>(
      `/providers/${id}/verification`,
      data
    );
    return response.data;
  },

  deleteProvider: async (id: string): Promise<ApiResponse<boolean>> => {
    const response = await apiClient.delete<ApiResponse<boolean>>(`/providers/${id}`);
    return response.data;
  },

  // Skills
  getSkills: async (providerId: string): Promise<ApiResponse<ProviderSkillResponseDto[]>> => {
    const response = await apiClient.get<ApiResponse<ProviderSkillResponseDto[]>>(`/providers/${providerId}/skills`);
    return response.data;
  },

  addSkill: async (
    providerId: string,
    data: AddProviderSkillRequestDto
  ): Promise<ApiResponse<ProviderSkillResponseDto>> => {
    const response = await apiClient.post<ApiResponse<ProviderSkillResponseDto>>(
      `/providers/${providerId}/skills`,
      data
    );
    return response.data;
  },

  removeSkill: async (providerId: string, skillId: string): Promise<ApiResponse<boolean>> => {
    const response = await apiClient.delete<ApiResponse<boolean>>(
      `/providers/${providerId}/skills/${skillId}`
    );
    return response.data;
  },

  // Availability
  getAvailability: async (
    providerId: string,
    startDateUtc?: string,
    endDateUtc?: string
  ): Promise<ApiResponse<ProviderAvailabilityResponseDto[]>> => {
    const response = await apiClient.get<ApiResponse<ProviderAvailabilityResponseDto[]>>(
      `/providers/${providerId}/availability`,
      { params: { startDateUtc, endDateUtc } }
    );
    return response.data;
  },

  addAvailability: async (
    providerId: string,
    data: AddProviderAvailabilityRequestDto
  ): Promise<ApiResponse<ProviderAvailabilityResponseDto>> => {
    const response = await apiClient.post<ApiResponse<ProviderAvailabilityResponseDto>>(
      `/providers/${providerId}/availability`,
      data
    );
    return response.data;
  },

  updateAvailability: async (
    providerId: string,
    availabilityId: string,
    data: UpdateProviderAvailabilityRequestDto
  ): Promise<ApiResponse<ProviderAvailabilityResponseDto>> => {
    const response = await apiClient.put<ApiResponse<ProviderAvailabilityResponseDto>>(
      `/providers/${providerId}/availability/${availabilityId}`,
      data
    );
    return response.data;
  },

  deleteAvailability: async (providerId: string, availabilityId: string): Promise<ApiResponse<boolean>> => {
    const response = await apiClient.delete<ApiResponse<boolean>>(
      `/providers/${providerId}/availability/${availabilityId}`
    );
    return response.data;
  },

  // History
  getHistory: async (providerId: string): Promise<ApiResponse<ProviderHistoryResponseDto[]>> => {
    const response = await apiClient.get<ApiResponse<ProviderHistoryResponseDto[]>>(
      `/providers/${providerId}/history`
    );
    return response.data;
  },

  addHistory: async (
    providerId: string,
    data: AddProviderHistoryRequestDto
  ): Promise<ApiResponse<ProviderHistoryResponseDto>> => {
    const response = await apiClient.post<ApiResponse<ProviderHistoryResponseDto>>(
      `/providers/${providerId}/history`,
      data
    );
    return response.data;
  },

  // Deterministic Matching
  matchProviders: async (
    data: ProviderMatchingRequestDto
  ): Promise<ApiResponse<ProviderMatchingResultDto>> => {
    const response = await apiClient.post<ApiResponse<ProviderMatchingResultDto>>('/providers/match', data);
    return response.data;
  },
};
