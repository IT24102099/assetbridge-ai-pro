import apiClient from '../api';
import { ApiResponse } from '../../types/auth';

export interface NotificationDto {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: number;
  typeName: string;
  isRead: boolean;
  relatedWorkflowInstanceId?: string | null;
  createdAtUtc: string;
}

export const notificationApi = {
  getNotifications: async (limit = 20): Promise<ApiResponse<NotificationDto[]>> => {
    const res = await apiClient.get<ApiResponse<NotificationDto[]>>(`/notifications?limit=${limit}`);
    return res.data;
  },

  getUnreadCount: async (): Promise<ApiResponse<number>> => {
    const res = await apiClient.get<ApiResponse<number>>('/notifications/unread-count');
    return res.data;
  },

  markAsRead: async (id: string): Promise<ApiResponse<boolean>> => {
    const res = await apiClient.patch<ApiResponse<boolean>>(`/notifications/${id}/read`);
    return res.data;
  },

  markAllAsRead: async (): Promise<ApiResponse<boolean>> => {
    const res = await apiClient.patch<ApiResponse<boolean>>('/notifications/read-all');
    return res.data;
  },
};
