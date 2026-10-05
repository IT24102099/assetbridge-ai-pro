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

class AgentRunModel {
  final String id;
  final String workflowInstanceId;
  final String agentName;
  final String agentTypeName;
  final String statusName;
  final String? outputSummary;
  final String? inputSummary;
  final String? errorMessage;
  final int durationMs;
  final String startedAtUtc;
  final String? completedAtUtc;
  final List<ToolExecutionModel> toolExecutions;

  AgentRunModel({
    required this.id,
    required this.workflowInstanceId,
    required this.agentName,
    required this.agentTypeName,
    required this.statusName,
    this.outputSummary,
    this.inputSummary,
    this.errorMessage,
    this.durationMs = 0,
    required this.startedAtUtc,
    this.completedAtUtc,
    this.toolExecutions = const [],
  });

  factory AgentRunModel.fromJson(Map<String, dynamic> json) {
    final rawTools = json['toolExecutions'] as List<dynamic>? ?? [];
    return AgentRunModel(
      id: json['id'] ?? '',
      workflowInstanceId: json['workflowInstanceId'] ?? '',
      agentName: json['agentName'] ?? 'Agentic AI Agent',
      agentTypeName: json['agentTypeName'] ?? '',
      statusName: json['statusName'] ?? 'Completed',
      outputSummary: json['outputSummary'],
      inputSummary: json['inputSummary'],
      errorMessage: json['errorMessage'],
      durationMs: json['durationMs'] ?? 0,
      startedAtUtc: json['startedAtUtc'] ?? '',
      completedAtUtc: json['completedAtUtc'],
      toolExecutions: rawTools
          .map((t) => ToolExecutionModel.fromJson(t as Map<String, dynamic>))
          .toList(),
    );
  }
}

class ToolExecutionModel {
  final String id;
  final String toolName;
  final String statusName;
  final String? outputSummary;
  final int durationMs;

  ToolExecutionModel({
    required this.id,
    required this.toolName,
    required this.statusName,
    this.outputSummary,
    this.durationMs = 0,
  });

  factory ToolExecutionModel.fromJson(Map<String, dynamic> json) {
    return ToolExecutionModel(
      id: json['id'] ?? '',
      toolName: json['toolName'] ?? '',
      statusName: json['statusName'] ?? 'Success',
      outputSummary: json['outputSummary'],
      durationMs: json['durationMs'] ?? 0,
    );
  }
}
