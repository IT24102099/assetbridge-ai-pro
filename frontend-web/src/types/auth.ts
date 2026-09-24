export type UserRole = 'Owner' | 'Representative' | 'ServiceProvider' | 'Manager' | 'Admin';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  role: UserRole;
  isActive: boolean;
  createdAtUtc: string;
  lastLoginAtUtc?: string;
}

export type UserProfile = User;

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  errors?: Record<string, string[]> | null;
  timestampUtc: string;
}

export interface PagedResponse<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface LoginResponseDto {
  token: string;
  tokenType: string;
  expiresInMinutes: number;
  user: User;
}

export interface RegisterRequestDto {
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
  role: UserRole;
}
