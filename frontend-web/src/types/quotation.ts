import { VerificationStatus } from './representative';

export enum QuotationStatus {
  Draft = 1,
  Submitted = 2,
  UnderReview = 3,
  Accepted = 4,
  Rejected = 5,
  Expired = 6,
  Cancelled = 7,
}

export interface QuotationItemResponseDto {
  id: string;
  quotationId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  createdAtUtc: string;
}

export interface CreateQuotationItemRequestDto {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface UpdateQuotationItemRequestDto {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface QuotationResponseDto {
  id: string;
  incidentId: string;
  incidentTitle: string;
  providerId: string;
  providerBusinessName: string;
  providerRating: number;
  providerVerificationStatus: VerificationStatus;
  validUntilUtc: string;
  isExpired: boolean;
  notes?: string | null;
  subtotal: number;
  taxAndOtherCharges: number;
  totalAmount: number;
  status: QuotationStatus;
  statusName: string;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
  items: QuotationItemResponseDto[];
}

export interface CreateQuotationRequestDto {
  incidentId: string;
  providerId: string;
  validUntilUtc: string;
  notes?: string | null;
  taxAndOtherCharges: number;
  items: CreateQuotationItemRequestDto[];
}

export interface UpdateQuotationRequestDto {
  validUntilUtc: string;
  notes?: string | null;
  taxAndOtherCharges: number;
}

export interface UpdateQuotationStatusRequestDto {
  status: QuotationStatus;
}

export interface QuotationQueryParametersDto {
  incidentId?: string;
  providerId?: string;
  status?: QuotationStatus;
  excludeExpired?: boolean;
  pageNumber?: number;
  pageSize?: number;
  sortBy?: string;
  sortDescending?: boolean;
}

export interface BudgetCheckRequestDto {
  incidentId?: string;
  quotationId?: string;
  estimatedBudget?: number;
  quotationAmount?: number;
}

export interface BudgetCheckResultDto {
  incidentId?: string;
  quotationId?: string;
  estimatedBudget: number;
  quotationAmount: number;
  differenceAmount: number;
  isWithinBudget: boolean;
  budgetUtilizationPercentage: number;
  explanation: string;
}

export interface QuotationComparisonRequestDto {
  incidentId: string;
  quotationIds?: string[];
}

export interface QuotationComparisonCandidateDto {
  quotationId: string;
  providerId: string;
  providerBusinessName: string;
  providerRating: number;
  providerVerificationStatus: VerificationStatus;
  totalAmount: number;
  isWithinBudget: boolean;
  differenceFromBudget: number;
  budgetUtilizationPercentage: number;
  isLowestCost: boolean;
  differenceFromLowest: number;
  comparisonScore: number;
  comparisonReasons: string[];
}

export interface QuotationComparisonResultDto {
  incidentId: string;
  incidentTitle: string;
  estimatedBudget?: number | null;
  quotationsEvaluatedCount: number;
  lowestQuotationAmount: number;
  recommendedQuotationId?: string | null;
  candidates: QuotationComparisonCandidateDto[];
}
