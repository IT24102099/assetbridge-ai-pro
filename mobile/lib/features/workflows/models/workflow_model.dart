class WorkflowModel {
  final String id;
  final String incidentId;
  final String incidentTitle;
  final String assetId;
  final String assetName;
  final String currentState;
  final String priority;
  final String? assignedProviderId;
  final String? assignedProviderName;
  final String? approvalStatus;
  final String? rejectionReason;
  final String? revisionReason;
  final String? createdAtUtc;
  final String? updatedAtUtc;
  final List<WorkflowStepModel> steps;

  WorkflowModel({
    required this.id,
    required this.incidentId,
    required this.incidentTitle,
    required this.assetId,
    required this.assetName,
    required this.currentState,
    required this.priority,
    this.assignedProviderId,
    this.assignedProviderName,
    this.approvalStatus,
    this.rejectionReason,
    this.revisionReason,
    this.createdAtUtc,
    this.updatedAtUtc,
    this.steps = const [],
  });

  factory WorkflowModel.fromJson(Map<String, dynamic> json) {
    final rawSteps = json['steps'] as List<dynamic>? ?? [];
    return WorkflowModel(
      id: json['id'] ?? '',
      incidentId: json['incidentId'] ?? '',
      incidentTitle: json['incidentTitle'] ?? 'Incident Repair',
      assetId: json['assetId'] ?? '',
      assetName: json['assetName'] ?? 'Property',
      currentState: json['currentStateName'] ?? json['currentState'] ?? 'Created',
      priority: json['priorityName'] ?? json['priority'] ?? 'Medium',
      assignedProviderId: json['assignedProviderId'],
      assignedProviderName: json['assignedProviderName'],
      approvalStatus: json['approvalStatus'],
      rejectionReason: json['rejectionReason'],
      revisionReason: json['revisionReason'],
      createdAtUtc: json['createdAtUtc'],
      updatedAtUtc: json['updatedAtUtc'],
      steps: rawSteps
          .map((e) => WorkflowStepModel.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

class WorkflowStepModel {
  final String id;
  final String state;
  final String status;
  final String? executedByActor;
  final String? executionSummary;
  final int durationMs;
  final String? timestampUtc;

  WorkflowStepModel({
    required this.id,
    required this.state,
    required this.status,
    this.executedByActor,
    this.executionSummary,
    this.durationMs = 0,
    this.timestampUtc,
  });

  factory WorkflowStepModel.fromJson(Map<String, dynamic> json) {
    return WorkflowStepModel(
      id: json['id'] ?? '',
      state: json['stateName'] ?? json['state'] ?? '',
      status: json['statusName'] ?? json['status'] ?? 'Completed',
      executedByActor: json['executedByActor'] ?? json['performedByUserName'],
      executionSummary: json['executionSummary'] ?? json['notes'],
      durationMs: json['durationMs'] ?? 0,
      timestampUtc: json['timestampUtc'] ?? json['createdAtUtc'],
    );
  }
}
