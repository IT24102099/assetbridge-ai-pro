import apiClient from '../api';
import { ApiResponse, PagedResponse } from '../../types/auth';
import {
  QuotationResponseDto,
  QuotationItemResponseDto,
  CreateQuotationRequestDto,
  UpdateQuotationRequestDto,
  UpdateQuotationStatusRequestDto,
  CreateQuotationItemRequestDto,
  UpdateQuotationItemRequestDto,
  QuotationQueryParametersDto,
  BudgetCheckRequestDto,
  BudgetCheckResultDto,
  QuotationComparisonRequestDto,
  QuotationComparisonResultDto,
} from '../../types/quotation';

export const quotationApi = {
  // Quotations
  getQuotations: async (
    params?: QuotationQueryParametersDto
  ): Promise<ApiResponse<PagedResponse<QuotationResponseDto>>> => {
    const response = await apiClient.get<ApiResponse<PagedResponse<QuotationResponseDto>>>(
      '/quotations',
      { params }
    );
    return response.data;
  },

  getQuotationById: async (id: string): Promise<ApiResponse<QuotationResponseDto>> => {
    const response = await apiClient.get<ApiResponse<QuotationResponseDto>>(`/quotations/${id}`);
    return response.data;
  },

  createQuotation: async (
    data: CreateQuotationRequestDto
  ): Promise<ApiResponse<QuotationResponseDto>> => {
    const response = await apiClient.post<ApiResponse<QuotationResponseDto>>('/quotations', data);
    return response.data;
  },

  updateQuotation: async (
    id: string,
    data: UpdateQuotationRequestDto
  ): Promise<ApiResponse<QuotationResponseDto>> => {
    const response = await apiClient.put<ApiResponse<QuotationResponseDto>>(`/quotations/${id}`, data);
    return response.data;
  },

  updateQuotationStatus: async (
    id: string,
    data: UpdateQuotationStatusRequestDto
  ): Promise<ApiResponse<QuotationResponseDto>> => {
    const response = await apiClient.patch<ApiResponse<QuotationResponseDto>>(
      `/quotations/${id}/status`,
      data
    );
    return response.data;
  },

  // Line Items
  addItem: async (
    quotationId: string,
    data: CreateQuotationItemRequestDto
  ): Promise<ApiResponse<QuotationItemResponseDto>> => {
    const response = await apiClient.post<ApiResponse<QuotationItemResponseDto>>(
      `/quotations/${quotationId}/items`,
      data
    );
    return response.data;
  },

  updateItem: async (
    quotationId: string,
    itemId: string,
    data: UpdateQuotationItemRequestDto
  ): Promise<ApiResponse<QuotationItemResponseDto>> => {
    const response = await apiClient.put<ApiResponse<QuotationItemResponseDto>>(
      `/quotations/${quotationId}/items/${itemId}`,
      data
    );
    return response.data;
  },

  removeItem: async (
    quotationId: string,
    itemId: string
  ): Promise<ApiResponse<boolean>> => {
    const response = await apiClient.delete<ApiResponse<boolean>>(
      `/quotations/${quotationId}/items/${itemId}`
    );
    return response.data;
  },

  // Budget & Comparison
  checkBudget: async (
    data: BudgetCheckRequestDto
  ): Promise<ApiResponse<BudgetCheckResultDto>> => {
    const response = await apiClient.post<ApiResponse<BudgetCheckResultDto>>(
      '/quotations/check-budget',
      data
    );
    return response.data;
  },

  compareQuotations: async (
    data: QuotationComparisonRequestDto
  ): Promise<ApiResponse<QuotationComparisonResultDto>> => {
    const response = await apiClient.post<ApiResponse<QuotationComparisonResultDto>>(
      '/quotations/compare',
      data
    );
    return response.data;
  },
};
