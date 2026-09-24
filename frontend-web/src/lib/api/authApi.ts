import apiClient from '../api';
import { ApiResponse, LoginResponseDto, User, RegisterRequestDto } from '../../types/auth';

export const authApi = {
  login: async (email: string, password: string): Promise<ApiResponse<LoginResponseDto>> => {
    const response = await apiClient.post<ApiResponse<LoginResponseDto>>('/auth/login', { email, password });
    return response.data;
  },

  register: async (data: RegisterRequestDto): Promise<ApiResponse<User>> => {
    const response = await apiClient.post<ApiResponse<User>>('/auth/register', data);
    return response.data;
  },

  getCurrentUser: async (): Promise<ApiResponse<User>> => {
    const response = await apiClient.get<ApiResponse<User>>('/auth/me');
    return response.data;
  },

  getAvailableRoles: async (): Promise<ApiResponse<Array<{ id: number; name: string }>>> => {
    const response = await apiClient.get<ApiResponse<Array<{ id: number; name: string }>>>('/auth/roles');
    return response.data;
  },
};
