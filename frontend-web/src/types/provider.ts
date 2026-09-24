import { VerificationStatus } from './representative';
import { IncidentCategory } from './incident';

export interface ProviderSkillResponseDto {
  id: string;
  providerId: string;
  category: IncidentCategory;
  skillName: string;
  yearsOfExperience: number;
  licenseNumber?: string;
  isPrimary: boolean;
  notes?: string;
  createdAtUtc: string;
}

export interface AddProviderSkillRequestDto {
  category: IncidentCategory;
  skillName: string;
  yearsOfExperience: number;
  licenseNumber?: string;
  isPrimary?: boolean;
  notes?: string;
}

export type AvailabilityStatus = 'Available' | 'Busy' | 'Unavailable' | 'OnLeave';

export interface ProviderAvailabilityResponseDto {
  id: string;
  providerId: string;
  availableDateUtc: string;
  startTime: string;
  endTime: string;
  status: AvailabilityStatus;
  statusName: string;
  notes?: string;
  createdAtUtc: string;
}

export interface AddProviderAvailabilityRequestDto {
  availableDateUtc: string;
  startTime: string;
  endTime: string;
  status: AvailabilityStatus;
  notes?: string;
}

export interface UpdateProviderAvailabilityRequestDto {
  startTime: string;
  endTime: string;
  status: AvailabilityStatus;
  notes?: string;
}

export interface ProviderHistoryResponseDto {
  id: string;
  providerId: string;
  incidentId?: string;
  incidentTitle?: string;
  completionDateUtc: string;
  jobTitle: string;
  trade: string;
  ratingGiven: number;
  ownerReview?: string;
  representativeFeedback?: string;
  actualCostLkr?: number;
  completedOnTime: boolean;
  createdAtUtc: string;
}

export interface AddProviderHistoryRequestDto {
  incidentId?: string;
  jobTitle: string;
  trade: string;
  ratingGiven: number;
  ownerReview?: string;
  representativeFeedback?: string;
  actualCostLkr?: number;
  completedOnTime: boolean;
}

export interface ServiceProviderResponseDto {
  id: string;
  userId: string;
  businessName: string;
  contactPerson: string;
  phoneNumber: string;
  email: string;
  primaryDistrict: string;
  city: string;
  address?: string;
  baseLatitude?: number;
  baseLongitude?: number;
  serviceRadiusKm: number;
  verificationStatus: VerificationStatus;
  verificationNotes?: string;
  rating: number;
  completedJobsCount: number;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc?: string;
  skills: ProviderSkillResponseDto[];
}

export interface CreateServiceProviderRequestDto {
  businessName: string;
  contactPerson: string;
  phoneNumber: string;
  email: string;
  primaryDistrict: string;
  city: string;
  address?: string;
  baseLatitude?: number;
  baseLongitude?: number;
  serviceRadiusKm?: number;
}

export interface UpdateServiceProviderRequestDto {
  businessName: string;
  contactPerson: string;
  phoneNumber: string;
  primaryDistrict: string;
  city: string;
  address?: string;
  baseLatitude?: number;
  baseLongitude?: number;
  serviceRadiusKm?: number;
  isActive?: boolean;
}

export interface ProviderQueryParametersDto {
  pageNumber?: number;
  pageSize?: number;
  searchTerm?: string;
  district?: string;
  city?: string;
  category?: IncidentCategory | string;
  status?: VerificationStatus | string;
  isActive?: boolean;
}

export interface ProviderMatchingRequestDto {
  incidentId?: string;
  category?: IncidentCategory;
  district?: string;
  city?: string;
  targetLatitude?: number;
  targetLongitude?: number;
  requiredDateUtc?: string;
  maxDistanceKm?: number;
  maxResults?: number;
}

export interface ProviderMatchCandidateDto {
  providerId: string;
  businessName: string;
  contactPerson: string;
  phoneNumber: string;
  email: string;
  primaryDistrict: string;
  city: string;
  verificationStatus: VerificationStatus;
  rating: number;
  completedJobsCount: number;
  matchScore: number;
  distanceKm?: number;
  hasRequiredSkill: boolean;
  matchingSkills: string[];
  isAvailableOnRequiredDate?: boolean;
  explanationReasons: string[];
}

export interface ProviderMatchingResultDto {
  targetCategory?: IncidentCategory;
  targetDistrict?: string;
  targetDateUtc?: string;
  totalCandidatesEvaluated: number;
  matchedCandidatesCount: number;
  candidates: ProviderMatchCandidateDto[];
}
