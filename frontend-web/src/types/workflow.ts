// Defines the 15 deterministic states in the AssetBridge AI workflow state machine.
// Arbitrary state jumps are strictly prohibited; all state transitions obey
// legal transition pathways enforced by the backend workflow engine.
export enum WorkflowState {
  Created = 1,
  Planning = 2,
  ProviderSelection = 3,
  InspectionPending = 4,
  QuotationReview = 5,
  AiValidation = 6,
  AwaitingApproval = 7,
  RevisionRequested = 8,
  Approved = 9,
  Rejected = 10,
  Execution = 11,
  CompletionReview = 12,
  Completed = 13,
  FollowUp = 14,
  Failed = 15
}

export const WORKFLOW_STATE_LABELS: Record<WorkflowState, string> = {
  [WorkflowState.Created]: 'Created',
  [WorkflowState.Planning]: 'Planning',
  [WorkflowState.ProviderSelection]: 'Provider Selection',
  [WorkflowState.InspectionPending]: 'Inspection Pending',
  [WorkflowState.QuotationReview]: 'Quotation Review',
  [WorkflowState.AiValidation]: 'AI Validation',
  [WorkflowState.AwaitingApproval]: 'Awaiting Approval',
  [WorkflowState.RevisionRequested]: 'Revision Requested',
  [WorkflowState.Approved]: 'Approved',
  [WorkflowState.Rejected]: 'Rejected',
  [WorkflowState.Execution]: 'Execution',
  [WorkflowState.CompletionReview]: 'Completion Review',
  [WorkflowState.Completed]: 'Completed',
  [WorkflowState.FollowUp]: 'Follow Up',
  [WorkflowState.Failed]: 'Failed'
};

export enum WorkflowStepStatus {
  Pending = 1,
  InProgress = 2,
  Completed = 3,
  Failed = 4,
  Skipped = 5
}

export interface WorkflowStepDto {
  id: string;
  workflowInstanceId: string;
  stepState: WorkflowState;
  stepStateName: string;
  status: WorkflowStepStatus;
  statusName: string;
  startedAtUtc: string;
  completedAtUtc?: string | null;
  startedBy: string;
  completedBy?: string | null;
  notes?: string | null;
  errorMessage?: string | null;
  durationSeconds?: number | null;
}

export interface WorkflowInstanceDto {
  id: string;
  incidentId: string;
  incidentTitle: string;
  assetId: string;
  assetName: string;
  currentState: WorkflowState;
  currentStateName: string;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
  startedAtUtc?: string | null;
  completedAtUtc?: string | null;
  failureReason?: string | null;
  correlationId: string;
  createdByUserId: string;
  createdByUserName: string;
  stepsCount: number;
  pendingApprovalsCount: number;
}

export interface CreateWorkflowRequestDto {
  incidentId: string;
  initialNotes?: string | null;
}

export interface TransitionWorkflowRequestDto {
  targetState: WorkflowState;
  reason?: string | null;
  actor?: string | null;
  metadataJson?: string | null;
}

export interface FailWorkflowRequestDto {
  failureReason: string;
  details?: string | null;
}

export interface WorkflowFilterParametersDto {
  state?: WorkflowState;
  incidentId?: string;
  assetId?: string;
  fromDateUtc?: string;
  toDateUtc?: string;
  pageNumber?: number;
  pageSize?: number;
  sortBy?: string;
  sortDescending?: boolean;
}

export interface WorkflowTimelineDto {
  workflowInstanceId: string;
  incidentId: string;
  currentState: WorkflowState;
  currentStateName: string;
  createdAtUtc: string;
  completedAtUtc?: string | null;
  steps: WorkflowStepDto[];
  approvals: ApprovalRequestDto[];
  auditEvents: AuditEventDto[];
}

// Approval Enums and DTOs
export enum ApprovalStatus {
  Pending = 1,
  Approved = 2,
  Rejected = 3,
  Cancelled = 4
}

export enum ApprovalDecision {
  Approve = 1,
  Reject = 2,
  RequestRevision = 3
}

export interface ApprovalRequestDto {
  id: string;
  workflowInstanceId: string;
  requestedByUserId: string;
  requestedByUserName: string;
  assignedApproverUserId?: string | null;
  assignedApproverUserName?: string | null;
  status: ApprovalStatus;
  statusName: string;
  decision?: ApprovalDecision | null;
  decisionName?: string | null;
  decisionReason?: string | null;
  requestedAtUtc: string;
  decidedAtUtc?: string | null;
  revisionComment?: string | null;
}

export interface CreateApprovalRequestDto {
  assignedApproverUserId?: string | null;
  initialNotes?: string | null;
}

export interface ApprovalDecisionRequestDto {
  decisionReason: string;
}

export interface RevisionRequestDto {
  revisionComment: string;
  decisionReason: string;
}

// Agent Telemetry and Tool Execution Enums and DTOs
export enum AgentType {
  IncidentPlanning = 1,
  ProviderIntelligence = 2,
  MaintenanceRecommendation = 3,
  ValidationAndContinuity = 4,
  ReportingAndAuditing = 5
}

export enum AgentRunStatus {
  Started = 1,
  Running = 2,
  Completed = 3,
  Failed = 4,
  Cancelled = 5
}

export enum ToolExecutionStatus {
  Started = 1,
  Success = 2,
  Failed = 3
}

export interface ToolExecutionDto {
  id: string;
  agentRunId: string;
  toolName: string;
  startedAtUtc: string;
  completedAtUtc?: string | null;
  durationMs?: number | null;
  inputSummary?: string | null;
  outputSummary?: string | null;
  status: ToolExecutionStatus;
  statusName: string;
  validationResult?: string | null;
  errorMessage?: string | null;
}

export interface CreateToolExecutionDto {
  toolName: string;
  inputSummary?: string | null;
  outputSummary?: string | null;
  status?: ToolExecutionStatus;
  validationResult?: string | null;
  errorMessage?: string | null;
  durationMs?: number | null;
}

export interface AgentRunDto {
  id: string;
  workflowInstanceId: string;
  agentName: string;
  agentType: AgentType;
  agentTypeName: string;
  status: AgentRunStatus;
  statusName: string;
  startedAtUtc: string;
  completedAtUtc?: string | null;
  durationMs?: number | null;
  inputSummary?: string | null;
  outputSummary?: string | null;
  errorMessage?: string | null;
  retryCount: number;
  correlationId: string;
  toolExecutions: ToolExecutionDto[];
}

export interface CreateAgentRunDto {
  agentName: string;
  agentType: AgentType;
  inputSummary?: string | null;
  correlationId?: string | null;
}

// Governance Audit Log Enums and DTOs
export enum AuditEventType {
  WorkflowCreated = 1,
  StateTransitioned = 2,
  AgentRunStarted = 3,
  AgentRunCompleted = 4,
  ToolExecuted = 5,
  ApprovalRequested = 6,
  ApprovalApproved = 7,
  ApprovalRejected = 8,
  RevisionRequested = 9,
  FollowUpScheduled = 10,
  SystemError = 11,
  SecurityViolation = 12
}

export interface AuditEventDto {
  id: string;
  workflowInstanceId?: string | null;
  userId?: string | null;
  userName?: string | null;
  eventType: AuditEventType;
  eventTypeName: string;
  description: string;
  metadataJson?: string | null;
  correlationId: string;
  createdAtUtc: string;
}

export interface AuditFilterParametersDto {
  workflowInstanceId?: string;
  userId?: string;
  eventType?: AuditEventType;
  fromDateUtc?: string;
  toDateUtc?: string;
  pageNumber?: number;
  pageSize?: number;
}

// Continuity & Follow-Up Tasks
export enum FollowUpStatus {
  Pending = 1,
  Scheduled = 2,
  InProgress = 3,
  Completed = 4,
  Cancelled = 5
}

export enum FollowUpPriority {
  Low = 1,
  Medium = 2,
  High = 3,
  Urgent = 4
}

export interface FollowUpTaskDto {
  id: string;
  workflowInstanceId?: string | null;
  assetId: string;
  assetName: string;
  title: string;
  description: string;
  dueDateUtc: string;
  status: FollowUpStatus;
  statusName: string;
  priority: FollowUpPriority;
  priorityName: string;
  createdAtUtc: string;
  completedAtUtc?: string | null;
  assignedToUserId?: string | null;
  assignedToUserName?: string | null;
  isOverdue: boolean;
}

export interface CreateFollowUpTaskDto {
  workflowInstanceId?: string | null;
  assetId: string;
  title: string;
  description: string;
  dueDateUtc: string;
  priority?: FollowUpPriority;
  assignedToUserId?: string | null;
}

export interface UpdateFollowUpStatusDto {
  status: FollowUpStatus;
  resolutionNotes?: string | null;
}

export interface FollowUpFilterParametersDto {
  assetId?: string;
  workflowInstanceId?: string;
  status?: FollowUpStatus;
  priority?: FollowUpPriority;
  isOverdue?: boolean;
  pageNumber?: number;
  pageSize?: number;
}

// Dashboard Metrics
export interface WorkflowDashboardMetricsDto {
  activeWorkflowsCount: number;
  pendingApprovalsCount: number;
  completedWorkflowsCount: number;
  failedWorkflowsCount: number;
  revisionsRequestedCount: number;
  overdueFollowUpsCount: number;
  pendingFollowUpsCount: number;
  totalAgentRunsCount: number;
  averageAgentDurationMs: number;
  recentWorkflows: WorkflowInstanceDto[];
  pendingApprovals: ApprovalRequestDto[];
  urgentFollowUps: FollowUpTaskDto[];
}
