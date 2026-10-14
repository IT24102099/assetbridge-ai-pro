import apiClient from '../api';
import { ApiResponse, LoginResponseDto, User, RegisterRequestDto } from '../../types/auth';

export const authApi = {
  login: async (email: string, password: string): Promise<ApiResponse<LoginResponseDto>> => {
    const response = await apiClient.post<ApiResponse<LoginResponseDto>>('/auth/login', { email, password });
    return response.data;
  },

  googleLogin: async (idToken: string): Promise<ApiResponse<LoginResponseDto>> => {
    const response = await apiClient.post<ApiResponse<LoginResponseDto>>('/auth/google', { idToken });
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

  updateProfile: async (data: { fullName: string; phoneNumber?: string }): Promise<ApiResponse<User>> => {
    const response = await apiClient.put<ApiResponse<User>>('/auth/profile', data);
    return response.data;
  },

  changePassword: async (data: { currentPassword: string; newPassword: string }): Promise<ApiResponse<boolean>> => {
    const response = await apiClient.put<ApiResponse<boolean>>('/auth/change-password', data);
    return response.data;
  },
};
