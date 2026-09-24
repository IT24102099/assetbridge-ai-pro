export enum FindingSeverity {
  Low = 1,
  Medium = 2,
  High = 3,
  Critical = 4,
}

export enum InspectionStatus {
  Scheduled = 1,
  InProgress = 2,
  Completed = 3,
  Cancelled = 4,
}

export interface InspectionFindingResponseDto {
  id: string;
  inspectionId: string;
  description: string;
  severity: FindingSeverity;
  severityName: string;
  recommendation: string;
  evidenceReference?: string | null;
  createdAtUtc: string;
}

export interface InspectionResponseDto {
  id: string;
  incidentId: string;
  incidentTitle: string;
  inspectorProviderId: string;
  inspectorBusinessName: string;
  scheduledAtUtc: string;
  completedAtUtc?: string | null;
  status: InspectionStatus;
  statusName: string;
  summary?: string | null;
  notes?: string | null;
  estimatedSeverity?: FindingSeverity | null;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
  findings: InspectionFindingResponseDto[];
}

export interface CreateInspectionRequestDto {
  incidentId: string;
  inspectorProviderId: string;
  scheduledAtUtc: string;
  notes?: string | null;
}

export interface UpdateInspectionRequestDto {
  scheduledAtUtc: string;
  completedAtUtc?: string | null;
  summary?: string | null;
  notes?: string | null;
  estimatedSeverity?: FindingSeverity | null;
}

export interface UpdateInspectionStatusRequestDto {
  status: InspectionStatus;
  completedAtUtc?: string | null;
  summary?: string | null;
}

export interface CreateInspectionFindingRequestDto {
  description: string;
  severity: FindingSeverity;
  recommendation: string;
  evidenceReference?: string | null;
}

export interface UpdateInspectionFindingRequestDto {
  description: string;
  severity: FindingSeverity;
  recommendation: string;
  evidenceReference?: string | null;
}

export interface InspectionQueryParametersDto {
  incidentId?: string;
  inspectorProviderId?: string;
  status?: InspectionStatus;
  pageNumber?: number;
  pageSize?: number;
  sortBy?: string;
  sortDescending?: boolean;
}
