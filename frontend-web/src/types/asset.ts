export type PropertyType = 'SingleFamilyHouse' | 'Apartment' | 'Villa' | 'Commercial' | 'Land';

export type AssetStatus = 'Active' | 'UnderMaintenance' | 'Archived' | 'Inactive';

export interface AssetMediaResponseDto {
  id: string;
  assetId: string;
  uploadedByUserId: string;
  uploadedByUserName: string;
  fileName: string;
  fileUrl: string;
  fileType?: string;
  fileSizeBytes: number;
  isThumbnail: boolean;
  caption?: string;
  createdAtUtc: string;
}

export interface AddAssetMediaRequestDto {
  fileName: string;
  fileUrl: string;
  fileType?: string;
  fileSizeBytes: number;
  isThumbnail?: boolean;
  caption?: string;
}

export interface AssetResponseDto {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  name: string;
  propertyType: PropertyType;
  propertyTypeName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  district: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  status: AssetStatus;
  statusName: string;
  activeIncidentCount: number;
  thumbnailUrl?: string;
  mediaCount: number;
  media?: AssetMediaResponseDto[];
  createdAtUtc: string;
  updatedAtUtc?: string;
}

export interface CreateAssetRequestDto {
  name: string;
  propertyType: PropertyType;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  district: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  description?: string;
}

export interface UpdateAssetRequestDto {
  name: string;
  propertyType: PropertyType;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  district: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  status: AssetStatus;
}

export interface AssetHistoryResponseDto {
  id: string;
  assetId: string;
  performedByUserId?: string;
  performedByUserName?: string;
  eventType: string;
  eventTitle: string;
  eventDescription: string;
  relatedIncidentId?: string;
  createdAtUtc: string;
}

export interface AssetQueryParametersDto {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  searchTerm?: string;
  propertyType?: PropertyType;
  district?: string;
  status?: AssetStatus;
  ownerId?: string;
}
