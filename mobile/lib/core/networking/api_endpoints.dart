class ApiEndpoints {
  // Auth
  static const String login = '/auth/login';
  static const String register = '/auth/register';
  static const String me = '/auth/me';

  // Member 1: Assets & Incidents
  static const String assets = '/assets';
  static String assetDetails(String id) => '/assets/$id';
  static String assetMedia(String id) => '/assets/$id/media';
  static String assetMediaUpload(String id) => '/assets/$id/media/upload';
  static const String incidents = '/incidents';
  static String incidentDetails(String id) => '/incidents/$id';
  static String incidentEvidence(String id) => '/incidents/$id/evidence';
  static String incidentEvidenceUpload(String id) => '/incidents/$id/evidence/upload';

  // Member 2: Providers & Representatives
  static const String providers = '/providers';
  static const String providerSearch = '/providers';
  static String providerDetails(String id) => '/providers/$id';
  static const String providerMatch = '/providers/match';

  static const String representatives = '/representatives';
  static const String representativeMe = '/representatives/me';
  static String representativeDetails(String id) => '/representatives/$id';
  static String representativeDocuments(String id) => '/representatives/$id/documents';
  static String representativeDocumentReview(String id, String docId) =>
      '/representatives/$id/documents/$docId/review';
  static String representativeVerification(String id) =>
      '/representatives/$id/verification';

  // Member 3: Inspections, Quotations & Maintenance
  static const String inspections = '/inspections';
  static String inspectionDetails(String id) => '/inspections/$id';
  static String inspectionFindings(String id) => '/inspections/$id/findings';

  static const String quotations = '/quotations';
  static String quotationDetails(String id) => '/quotations/$id';
  static const String compareQuotations = '/quotations/compare';
  static String quotationBudgetCheck(String id) => '/quotations/$id/check-budget';

  static const String maintenanceJobs = '/maintenance-jobs';
  static String maintenanceJobDetails(String id) => '/maintenance-jobs/$id';
  static String maintenanceJobStatus(String id) => '/maintenance-jobs/$id/status';

  // Member 4: Workflows, Approvals, Audit & Continuity
  static const String workflows = '/workflows';
  static String workflowDetails(String id) => '/workflows/$id';
  static String approveWorkflow(String id) => '/workflows/$id/approve';
  static String rejectWorkflow(String id) => '/workflows/$id/reject';
  static String requestWorkflowRevision(String id) => '/workflows/$id/request-revision';
  static String requestWorkflowChanges(String id) => '/workflows/$id/request-revision';
  static String workflowAgentRuns(String id) => '/workflows/$id/agent-runs';

  static const String followUps = '/follow-ups';
  static String followUpStatus(String id) => '/follow-ups/$id/status';
  static const String auditEvents = '/audit-events';
  static String propertyAssistant(String assetId) => '/workflows/property-assistant/$assetId';
  static String sendProposal(String workflowId) => '/workflows/$workflowId/send-proposal';
  static String ownerDecision(String workflowId) => '/workflows/$workflowId/owner-decision';
  static String rejectionAlternatives(String workflowId) => '/workflows/$workflowId/rejection-alternatives';

  // Notifications
  static const String notifications = '/notifications';
  static String notificationRead(String id) => '/notifications/$id/read';
  static const String notificationsReadAll = '/notifications/read-all';
}
