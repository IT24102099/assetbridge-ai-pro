export type IncidentCategory =
  | 'Plumbing'
  | 'Electrical'
  | 'Roofing'
  | 'Structural'
  | 'HVAC'
  | 'Carpentry'
  | 'PestControl'
  | 'Painting'
  | 'General';

export type IncidentPriority = 'Low' | 'Medium' | 'High' | 'Emergency';

export type IncidentStatus =
  | 'Reported'
  | 'Validating'
  | 'Planning'
  | 'ProviderSelection'
  | 'InspectionPending'
  | 'WorkInProgress'
  | 'Resolved'
  | 'Closed'
  | 'Cancelled';

export type EvidenceType = 'BeforeWork' | 'DuringWork' | 'AfterWork' | 'InspectionDocument' | 'InvoiceReceipt';

export interface IncidentEvidenceResponseDto {
  id: string;
  incidentId: string;
  uploadedByUserId: string;
  uploadedByUserName: string;
  fileUrl: string;
  fileName: string;
  fileType?: string;
  fileSizeBytes: number;
  evidenceType: EvidenceType;
  caption?: string;
  createdAtUtc: string;
}

export interface IncidentResponseDto {
  id: string;
  assetId: string;
  assetName: string;
  assetCity: string;
  reportedByUserId: string;
  reportedByUserName: string;
  reportedByUserEmail: string;
  title: string;
  description: string;
  category: IncidentCategory;
  categoryName: string;
  priority: IncidentPriority;
  priorityName: string;
  status: IncidentStatus;
  statusName: string;
  estimatedBudget?: number;
  requiredByUtc?: string;
  locationDetails?: string;
  evidenceCount: number;
  evidence: IncidentEvidenceResponseDto[];
  createdAtUtc: string;
  updatedAtUtc?: string;
}

export interface CreateIncidentRequestDto {
  assetId: string;
  title: string;
  description: string;
  category: IncidentCategory;
  priority: IncidentPriority;
  estimatedBudget?: number;
  requiredByUtc?: string;
  locationDetails?: string;
}

export interface UpdateIncidentRequestDto {
  title: string;
  description: string;
  category: IncidentCategory;
  priority: IncidentPriority;
  estimatedBudget?: number;
  requiredByUtc?: string;
  locationDetails?: string;
}

export interface UpdateIncidentStatusRequestDto {
  newStatus: IncidentStatus;
  statusChangeReason?: string;
}

export interface AddIncidentEvidenceRequestDto {
  fileUrl: string;
  fileName: string;
  fileType?: string;
  fileSizeBytes: number;
  evidenceType: EvidenceType;
  caption?: string;
}

export interface IncidentQueryParametersDto {
  pageNumber?: number;
  pageSize?: number;
  searchTerm?: string;
  assetId?: string;
  category?: IncidentCategory;
  priority?: IncidentPriority;
  status?: IncidentStatus;
  reportedByUserId?: string;
}
