export type WorkflowState =
  | 'Created'
  | 'Planning'
  | 'ProviderSelection'
  | 'InspectionPending'
  | 'QuotationReview'
  | 'AiValidation'
  | 'AwaitingApproval'
  | 'RevisionRequested'
  | 'Approved'
  | 'Rejected'
  | 'Execution'
  | 'CompletionReview'
  | 'Completed'
  | 'FollowUp'
  | 'Failed';

export interface WorkflowInstanceDto {
  id: string;
  incidentId: string;
  incidentTitle: string;
  assetId: string;
  assetName: string;
  currentState: WorkflowState;
  currentStateName: string;
  createdAtUtc: string;
  updatedAtUtc?: string;
  startedAtUtc?: string;
  completedAtUtc?: string;
  failureReason?: string;
  correlationId: string;
  createdByUserId: string;
  createdByUserName: string;
  stepsCount: number;
  pendingApprovalsCount: number;
}

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
}
