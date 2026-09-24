import apiClient from '../api';
import { ApiResponse, PagedResponse } from '../../types/auth';
import {
  AssetResponseDto,
  CreateAssetRequestDto,
  UpdateAssetRequestDto,
  AssetHistoryResponseDto,
  AssetQueryParametersDto,
  AddAssetMediaRequestDto,
  AssetMediaResponseDto,
} from '../../types/asset';

export const assetApi = {
  getAssets: async (params?: AssetQueryParametersDto): Promise<ApiResponse<PagedResponse<AssetResponseDto>>> => {
    const response = await apiClient.get<ApiResponse<PagedResponse<AssetResponseDto>>>('/assets', { params });
    return response.data;
  },

  getAssetById: async (id: string): Promise<ApiResponse<AssetResponseDto>> => {
    const response = await apiClient.get<ApiResponse<AssetResponseDto>>(`/assets/${id}`);
    return response.data;
  },

  createAsset: async (data: CreateAssetRequestDto): Promise<ApiResponse<AssetResponseDto>> => {
    const response = await apiClient.post<ApiResponse<AssetResponseDto>>('/assets', data);
    return response.data;
  },

  updateAsset: async (id: string, data: UpdateAssetRequestDto): Promise<ApiResponse<AssetResponseDto>> => {
    const response = await apiClient.put<ApiResponse<AssetResponseDto>>(`/assets/${id}`, data);
    return response.data;
  },

  deleteAsset: async (id: string): Promise<ApiResponse<boolean>> => {
    const response = await apiClient.delete<ApiResponse<boolean>>(`/assets/${id}`);
    return response.data;
  },

  getAssetHistory: async (id: string): Promise<ApiResponse<AssetHistoryResponseDto[]>> => {
    const response = await apiClient.get<ApiResponse<AssetHistoryResponseDto[]>>(`/assets/${id}/history`);
    return response.data;
  },

  addMedia: async (assetId: string, data: AddAssetMediaRequestDto): Promise<ApiResponse<AssetMediaResponseDto>> => {
    const response = await apiClient.post<ApiResponse<AssetMediaResponseDto>>(`/assets/${assetId}/media`, data);
    return response.data;
  },

  getMedia: async (assetId: string): Promise<ApiResponse<AssetMediaResponseDto[]>> => {
    const response = await apiClient.get<ApiResponse<AssetMediaResponseDto[]>>(`/assets/${assetId}/media`);
    return response.data;
  },

  deleteMedia: async (assetId: string, mediaId: string): Promise<ApiResponse<boolean>> => {
    const response = await apiClient.delete<ApiResponse<boolean>>(`/assets/${assetId}/media/${mediaId}`);
    return response.data;
  },

  setThumbnail: async (assetId: string, mediaId: string): Promise<ApiResponse<AssetMediaResponseDto>> => {
    const response = await apiClient.patch<ApiResponse<AssetMediaResponseDto>>(`/assets/${assetId}/media/${mediaId}/thumbnail`);
    return response.data;
  },
};
