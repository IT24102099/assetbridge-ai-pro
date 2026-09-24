export type VerificationStatus = 'Pending' | 'Verified' | 'Rejected' | 'Expired';

export interface RepresentativeResponseDto {
  id: string;
  userId: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  district: string;
  city: string;
  address?: string;
  nationalIdNumber?: string;
  verificationStatus: VerificationStatus;
  verificationStatusName: string;
  verificationNotes?: string;
  bio?: string;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc?: string;
}

export interface CreateRepresentativeRequestDto {
  fullName: string;
  phoneNumber: string;
  email: string;
  district: string;
  city: string;
  address?: string;
  nationalIdNumber?: string;
  bio?: string;
}

export interface UpdateRepresentativeRequestDto {
  fullName: string;
  phoneNumber: string;
  district: string;
  city: string;
  address?: string;
  nationalIdNumber?: string;
  bio?: string;
  isActive?: boolean;
}

export interface UpdateVerificationRequestDto {
  status: VerificationStatus;
  notes?: string;
}

export interface RepresentativeQueryParametersDto {
  pageNumber?: number;
  pageSize?: number;
  searchTerm?: string;
  district?: string;
  city?: string;
  status?: VerificationStatus | string;
  isActive?: boolean;
}
