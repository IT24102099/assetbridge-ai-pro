export enum MaintenanceJobStatus {
  Planned = 1,
  Scheduled = 2,
  InProgress = 3,
  Completed = 4,
  Cancelled = 5,
  Closed = 6,
}

export enum MaintenanceHistoryEventType {
  Inspection = 1,
  Quotation = 2,
  Repair = 3,
  PreventativeMaintenance = 4,
  EmergencyService = 5,
  Replacement = 6,
  Other = 7,
}

export interface MaintenanceJobResponseDto {
  id: string;
  incidentId: string;
  incidentTitle: string;
  providerId: string;
  providerBusinessName: string;
  inspectionId?: string | null;
  title: string;
  description: string;
  scheduledStartUtc: string;
  scheduledEndUtc: string;
  status: MaintenanceJobStatus;
  statusName: string;
  approvedBudget: number;
  actualCost?: number | null;
  completedAtUtc?: string | null;
  completionNotes?: string | null;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
}

export interface CreateMaintenanceJobRequestDto {
  incidentId: string;
  providerId: string;
  inspectionId?: string | null;
  title: string;
  description: string;
  scheduledStartUtc: string;
  scheduledEndUtc: string;
  approvedBudget: number;
}

export interface UpdateMaintenanceJobRequestDto {
  title: string;
  description: string;
  scheduledStartUtc: string;
  scheduledEndUtc: string;
  approvedBudget: number;
  actualCost?: number | null;
  completionNotes?: string | null;
}

export interface UpdateMaintenanceJobStatusRequestDto {
  status: MaintenanceJobStatus;
  actualCost?: number | null;
  completedAtUtc?: string | null;
  completionNotes?: string | null;
}

export interface MaintenanceJobQueryParametersDto {
  incidentId?: string;
  providerId?: string;
  status?: MaintenanceJobStatus;
  pageNumber?: number;
  pageSize?: number;
  sortBy?: string;
  sortDescending?: boolean;
}

export interface MaintenanceHistoryResponseDto {
  id: string;
  assetId: string;
  incidentId?: string | null;
  maintenanceJobId?: string | null;
  eventType: MaintenanceHistoryEventType;
  eventTypeName: string;
  title: string;
  description: string;
  recordedCost?: number | null;
  recordedByUserId: string;
  createdAtUtc: string;
}

export interface RecordMaintenanceHistoryRequestDto {
  assetId: string;
  incidentId?: string | null;
  maintenanceJobId?: string | null;
  eventType: MaintenanceHistoryEventType;
  title: string;
  description: string;
  recordedCost?: number | null;
}

export interface MaterialCatalogItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  referencePriceLkr: number;
  estimatedLaborRatePerHourLkr: number;
  availabilityStatus: 'In Stock' | 'Available On Order' | 'Limited';
  lastUpdated: string;
  supplierOrStandard: string;
}
