class ApiEndpoints {
  // Auth
  static const String login = '/auth/login';
  static const String register = '/auth/register';
  static const String me = '/auth/me';

  // Member 1: Assets & Incidents
  static const String assets = '/assets';
  static String assetDetails(String id) => '/assets/$id';
  static String assetMedia(String id) => '/assets/$id/media';
  static const String incidents = '/incidents';
  static String incidentDetails(String id) => '/incidents/$id';
  static String incidentEvidence(String id) => '/incidents/$id/evidence';

  // Member 2: Providers & Representatives
  static const String providers = '/providers';
  static const String providerSearch = '/providers/search';
  static String providerDetails(String id) => '/providers/$id';
  static const String representatives = '/representatives';
  static String representativeDetails(String id) => '/representatives/$id';

  // Member 3: Inspections, Quotations & Maintenance
  static const String inspections = '/inspections';
  static String inspectionDetails(String id) => '/inspections/$id';
  static const String quotations = '/quotations';
  static const String compareQuotations = '/quotations/compare';
  static const String maintenanceJobs = '/maintenance-jobs';
  static String maintenanceJobDetails(String id) => '/maintenance-jobs/$id';

  // Member 4: Workflows, Approvals, Audit & Continuity
  static const String workflows = '/workflows';
  static String workflowDetails(String id) => '/workflows/$id';
  static String approveWorkflow(String id) => '/workflows/$id/approve';
  static String rejectWorkflow(String id) => '/workflows/$id/reject';
  static String requestWorkflowChanges(String id) => '/workflows/$id/request-changes';
  static String workflowAgentRuns(String id) => '/workflows/$id/agent-runs';
  static const String followUps = '/follow-ups';
  static String followUpStatus(String id) => '/follow-ups/$id/status';
  static const String auditEvents = '/audit-events';
}
