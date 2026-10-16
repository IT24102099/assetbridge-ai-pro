class ProposalAlternativeModel {
  final String alternativeType;
  final String title;
  final String rationale;
  final String estimatedCostRangeLkr;
  final double feasibilityScore;
  final String actionCode;
  final String? targetUrl;

  ProposalAlternativeModel({
    required this.alternativeType,
    required this.title,
    required this.rationale,
    required this.estimatedCostRangeLkr,
    required this.feasibilityScore,
    required this.actionCode,
    this.targetUrl,
  });

  factory ProposalAlternativeModel.fromJson(Map<String, dynamic> json) {
    return ProposalAlternativeModel(
      alternativeType: json['alternativeType'] ?? '',
      title: json['title'] ?? 'Alternative Option',
      rationale: json['rationale'] ?? '',
      estimatedCostRangeLkr: json['estimatedCostRangeLkr'] ?? 'N/A',
      feasibilityScore: (json['feasibilityScore'] as num?)?.toDouble() ?? 0.85,
      actionCode: json['actionCode'] ?? '',
      targetUrl: json['targetUrl'],
    );
  }

  Map<String, dynamic> toJson() => {
    'alternativeType': alternativeType,
    'title': title,
    'rationale': rationale,
    'estimatedCostRangeLkr': estimatedCostRangeLkr,
    'feasibilityScore': feasibilityScore,
    'actionCode': actionCode,
    'targetUrl': targetUrl,
  };
}

class AssetMediaSummaryModel {
  final String id;
  final String fileUrl;
  final String fileName;
  final bool isThumbnail;

  AssetMediaSummaryModel({
    required this.id,
    required this.fileUrl,
    required this.fileName,
    required this.isThumbnail,
  });

  factory AssetMediaSummaryModel.fromJson(Map<String, dynamic> json) {
    return AssetMediaSummaryModel(
      id: json['id'] ?? '',
      fileUrl: json['fileUrl'] ?? '',
      fileName: json['fileName'] ?? '',
      isThumbnail: json['isThumbnail'] ?? false,
    );
  }
}

class PropertyAssistantIncidentModel {
  final String id;
  final String title;
  final String description;
  final String categoryName;
  final String priorityName;
  final String statusName;
  final double? estimatedBudget;
  final String? createdAtUtc;
  final int evidenceCount;
  final List<String> evidenceUrls;
  final String? assignedRepresentativeName;
  final String? activeWorkflowId;
  final String? workflowState;

  PropertyAssistantIncidentModel({
    required this.id,
    required this.title,
    required this.description,
    required this.categoryName,
    required this.priorityName,
    required this.statusName,
    this.estimatedBudget,
    this.createdAtUtc,
    this.evidenceCount = 0,
    this.evidenceUrls = const [],
    this.assignedRepresentativeName,
    this.activeWorkflowId,
    this.workflowState,
  });

  factory PropertyAssistantIncidentModel.fromJson(Map<String, dynamic> json) {
    return PropertyAssistantIncidentModel(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      categoryName: json['categoryName'] ?? (json['category']?.toString() ?? 'General'),
      priorityName: json['priorityName'] ?? (json['priority']?.toString() ?? 'Medium'),
      statusName: json['statusName'] ?? (json['status']?.toString() ?? 'Reported'),
      estimatedBudget: (json['estimatedBudget'] as num?)?.toDouble(),
      createdAtUtc: json['createdAtUtc'],
      evidenceCount: json['evidenceCount'] ?? 0,
      evidenceUrls: (json['evidenceUrls'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      assignedRepresentativeName: json['assignedRepresentativeName'],
      activeWorkflowId: json['activeWorkflowId'],
      workflowState: json['workflowState'],
    );
  }
}

class PropertyAssistantInspectionModel {
  final String id;
  final String incidentId;
  final String incidentTitle;
  final String? scheduledDate;
  final String status;
  final String? inspectorName;
  final String? findingsSummary;
  final int defectCount;
  final List<String> defectDescriptions;
  final List<String> recommendedActions;
  final bool followUpRequired;

  PropertyAssistantInspectionModel({
    required this.id,
    required this.incidentId,
    required this.incidentTitle,
    this.scheduledDate,
    required this.status,
    this.inspectorName,
    this.findingsSummary,
    this.defectCount = 0,
    this.defectDescriptions = const [],
    this.recommendedActions = const [],
    this.followUpRequired = false,
  });

  factory PropertyAssistantInspectionModel.fromJson(Map<String, dynamic> json) {
    return PropertyAssistantInspectionModel(
      id: json['id'] ?? '',
      incidentId: json['incidentId'] ?? '',
      incidentTitle: json['incidentTitle'] ?? 'Inspection',
      scheduledDate: json['scheduledDate'],
      status: json['status'] ?? 'Scheduled',
      inspectorName: json['inspectorName'],
      findingsSummary: json['findingsSummary'],
      defectCount: json['defectCount'] ?? 0,
      defectDescriptions: (json['defectDescriptions'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      recommendedActions: (json['recommendedActions'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      followUpRequired: json['followUpRequired'] ?? false,
    );
  }
}

class PropertyAssistantJobModel {
  final String id;
  final String incidentId;
  final String title;
  final String status;
  final String? providerName;
  final String? scheduledDate;
  final String? completedDate;
  final double? approvedBudget;
  final double? actualCost;
  final bool isOverdue;

  PropertyAssistantJobModel({
    required this.id,
    required this.incidentId,
    required this.title,
    required this.status,
    this.providerName,
    this.scheduledDate,
    this.completedDate,
    this.approvedBudget,
    this.actualCost,
    this.isOverdue = false,
  });

  factory PropertyAssistantJobModel.fromJson(Map<String, dynamic> json) {
    return PropertyAssistantJobModel(
      id: json['id'] ?? '',
      incidentId: json['incidentId'] ?? '',
      title: json['title'] ?? 'Maintenance Job',
      status: json['status'] ?? 'Scheduled',
      providerName: json['providerName'],
      scheduledDate: json['scheduledDate'],
      completedDate: json['completedDate'],
      approvedBudget: (json['approvedBudget'] as num?)?.toDouble(),
      actualCost: (json['actualCost'] as num?)?.toDouble(),
      isOverdue: json['isOverdue'] ?? false,
    );
  }
}

class PropertyAssistantQuotationModel {
  final String id;
  final String incidentId;
  final String? providerName;
  final double totalAmount;
  final double? materialCost;
  final double? laborCost;
  final int itemCount;
  final String status;
  final int warrantyMonths;
  final String? createdAtUtc;
  final bool isSentToOwner;

  PropertyAssistantQuotationModel({
    required this.id,
    required this.incidentId,
    this.providerName,
    required this.totalAmount,
    this.materialCost,
    this.laborCost,
    this.itemCount = 0,
    required this.status,
    this.warrantyMonths = 12,
    this.createdAtUtc,
    this.isSentToOwner = false,
  });

  factory PropertyAssistantQuotationModel.fromJson(Map<String, dynamic> json) {
    return PropertyAssistantQuotationModel(
      id: json['id'] ?? '',
      incidentId: json['incidentId'] ?? '',
      providerName: json['providerName'],
      totalAmount: (json['totalAmount'] as num?)?.toDouble() ?? 0.0,
      materialCost: (json['materialCost'] as num?)?.toDouble(),
      laborCost: (json['laborCost'] as num?)?.toDouble(),
      itemCount: json['itemCount'] ?? 0,
      status: json['status'] ?? 'Pending',
      warrantyMonths: json['warrantyMonths'] ?? 12,
      createdAtUtc: json['createdAtUtc'],
      isSentToOwner: json['isSentToOwner'] ?? false,
    );
  }
}

class WorkflowNextBestActionModel {
  final String title;
  final String actionCode;
  final String description;
  final String whyItMatters;
  final List<String> prerequisites;
  final String whatHappensNext;
  final double confidenceScore;
  final String? targetUrl;

  WorkflowNextBestActionModel({
    required this.title,
    required this.actionCode,
    required this.description,
    required this.whyItMatters,
    this.prerequisites = const [],
    required this.whatHappensNext,
    this.confidenceScore = 0.95,
    this.targetUrl,
  });

  factory WorkflowNextBestActionModel.fromJson(Map<String, dynamic>? json) {
    if (json == null) {
      return WorkflowNextBestActionModel(
        title: 'Review Property Status',
        actionCode: 'REVIEW',
        description: 'Verify current property and incident state.',
        whyItMatters: 'Maintains property integrity.',
        whatHappensNext: 'Next step determined by inspector.',
      );
    }
    return WorkflowNextBestActionModel(
      title: json['title'] ?? 'Next Best Action',
      actionCode: json['action_code'] ?? json['actionCode'] ?? 'ACTION',
      description: json['description'] ?? '',
      whyItMatters: json['why_it_matters'] ?? json['whyItMatters'] ?? '',
      prerequisites: (json['prerequisites'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      whatHappensNext: json['what_happens_next'] ?? json['whatHappensNext'] ?? '',
      confidenceScore: (json['confidence_score'] as num?)?.toDouble() ?? (json['confidenceScore'] as num?)?.toDouble() ?? 0.95,
      targetUrl: json['target_url'] ?? json['targetUrl'],
    );
  }
}

class PropertyWorkflowAssistantModel {
  final String assetId;
  final String assetCode;
  final String assetName;
  final String propertyTypeName;
  final String address;
  final String city;
  final String district;
  final String status;
  final String ownerId;
  final String ownerName;
  final String ownerEmail;
  final String? authorizedRepresentativeName;
  final String? thumbnailUrl;
  final List<AssetMediaSummaryModel> mediaList;

  // Correlated records
  final List<PropertyAssistantIncidentModel> incidents;
  final List<PropertyAssistantInspectionModel> inspections;
  final List<PropertyAssistantJobModel> maintenanceJobs;
  final List<PropertyAssistantQuotationModel> quotations;

  // Active Workflow & Human Governance
  final String? activeWorkflowId;
  final String currentWorkflowState;
  final String currentStageLabel;
  final String plainLanguageSummary;
  final String responsibleRole;

  // Proposal Lifecycle State
  final String proposalStatus; // "Draft", "SentToOwner", "ApprovedByOwner", "RejectedByOwner", "NotInitiated"
  final double? proposedAmountLkr;
  final String? proposedProviderName;
  final String? proposedQuotationId;
  final String? proposalSentAtUtc;
  final String? ownerDecidedAtUtc;
  final String? ownerRejectionReason;
  final String? ownerComments;
  final List<ProposalAlternativeModel> rejectionAlternatives;

  // Intelligence Quadrants
  final List<String> confirmedFacts;
  final List<String> aiRecommendations;
  final List<String> missingInformation;
  final List<String> awaitingHumanDecision;

  // Next Best Action
  final WorkflowNextBestActionModel recommendedNextAction;

  // Observability & Telemetry
  final int auditEventsCount;
  final String? recentAuditHighlight;
  final int activeFollowUpsCount;
  final bool isAiServiceConnected;

  PropertyWorkflowAssistantModel({
    required this.assetId,
    required this.assetCode,
    required this.assetName,
    required this.propertyTypeName,
    required this.address,
    required this.city,
    required this.district,
    required this.status,
    required this.ownerId,
    required this.ownerName,
    required this.ownerEmail,
    this.authorizedRepresentativeName,
    this.thumbnailUrl,
    this.mediaList = const [],
    this.incidents = const [],
    this.inspections = const [],
    this.maintenanceJobs = const [],
    this.quotations = const [],
    this.activeWorkflowId,
    required this.currentWorkflowState,
    required this.currentStageLabel,
    required this.plainLanguageSummary,
    required this.responsibleRole,
    required this.proposalStatus,
    this.proposedAmountLkr,
    this.proposedProviderName,
    this.proposedQuotationId,
    this.proposalSentAtUtc,
    this.ownerDecidedAtUtc,
    this.ownerRejectionReason,
    this.ownerComments,
    this.rejectionAlternatives = const [],
    this.confirmedFacts = const [],
    this.aiRecommendations = const [],
    this.missingInformation = const [],
    this.awaitingHumanDecision = const [],
    required this.recommendedNextAction,
    this.auditEventsCount = 0,
    this.recentAuditHighlight,
    this.activeFollowUpsCount = 0,
    this.isAiServiceConnected = true,
  });

  factory PropertyWorkflowAssistantModel.fromJson(Map<String, dynamic> json) {
    return PropertyWorkflowAssistantModel(
      assetId: json['assetId'] ?? '',
      assetCode: json['assetCode'] ?? 'AS-PRP',
      assetName: json['assetName'] ?? 'Property',
      propertyTypeName: json['propertyTypeName'] ?? 'Residential',
      address: json['address'] ?? '',
      city: json['city'] ?? '',
      district: json['district'] ?? '',
      status: json['status'] ?? 'Active',
      ownerId: json['ownerId'] ?? '',
      ownerName: json['ownerName'] ?? 'Owner',
      ownerEmail: json['ownerEmail'] ?? '',
      authorizedRepresentativeName: json['authorizedRepresentativeName'],
      thumbnailUrl: json['thumbnailUrl'],
      mediaList: (json['mediaList'] as List<dynamic>?)
              ?.map((e) => AssetMediaSummaryModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      incidents: (json['incidents'] as List<dynamic>?)
              ?.map((e) => PropertyAssistantIncidentModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      inspections: (json['inspections'] as List<dynamic>?)
              ?.map((e) => PropertyAssistantInspectionModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      maintenanceJobs: (json['maintenanceJobs'] as List<dynamic>?)
              ?.map((e) => PropertyAssistantJobModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      quotations: (json['quotations'] as List<dynamic>?)
              ?.map((e) => PropertyAssistantQuotationModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      activeWorkflowId: json['activeWorkflowId'],
      currentWorkflowState: json['currentWorkflowState'] ?? 'NoActiveWorkflow',
      currentStageLabel: json['currentStageLabel'] ?? 'All Quiet',
      plainLanguageSummary: json['plainLanguageSummary'] ?? '',
      responsibleRole: json['responsibleRole'] ?? 'Property Manager',
      proposalStatus: json['proposalStatus'] ?? 'NotInitiated',
      proposedAmountLkr: (json['proposedAmountLkr'] as num?)?.toDouble(),
      proposedProviderName: json['proposedProviderName'],
      proposedQuotationId: json['proposedQuotationId'],
      proposalSentAtUtc: json['proposalSentAtUtc'],
      ownerDecidedAtUtc: json['ownerDecidedAtUtc'],
      ownerRejectionReason: json['ownerRejectionReason'],
      ownerComments: json['ownerComments'],
      rejectionAlternatives: (json['rejectionAlternatives'] as List<dynamic>?)
              ?.map((e) => ProposalAlternativeModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      confirmedFacts: (json['confirmedFacts'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      aiRecommendations: (json['aiRecommendations'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      missingInformation: (json['missingInformation'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      awaitingHumanDecision: (json['awaitingHumanDecision'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      recommendedNextAction: WorkflowNextBestActionModel.fromJson(
        json['recommendedNextAction'] as Map<String, dynamic>?,
      ),
      auditEventsCount: json['auditEventsCount'] ?? 0,
      recentAuditHighlight: json['recentAuditHighlight'],
      activeFollowUpsCount: json['activeFollowUpsCount'] ?? 0,
      isAiServiceConnected: json['isAiServiceConnected'] ?? true,
    );
  }
}
