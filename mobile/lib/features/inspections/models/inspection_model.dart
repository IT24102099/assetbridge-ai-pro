class InspectionModel {
  final String id;
  final String assetId;
  final String assetName;
  final String? incidentId;
  final String representativeId;
  final String representativeName;
  final String scheduledDateUtc;
  final String? completedDateUtc;
  final String status;
  final String? overallAssessment;
  final List<InspectionFindingModel> findings;

  InspectionModel({
    required this.id,
    required this.assetId,
    required this.assetName,
    this.incidentId,
    required this.representativeId,
    required this.representativeName,
    required this.scheduledDateUtc,
    this.completedDateUtc,
    required this.status,
    this.overallAssessment,
    this.findings = const [],
  });

  factory InspectionModel.fromJson(Map<String, dynamic> json) {
    final rawFindings = json['findings'] as List<dynamic>? ?? [];
    return InspectionModel(
      id: json['id'] ?? '',
      assetId: json['assetId'] ?? '',
      assetName: json['assetName'] ?? '',
      incidentId: json['incidentId'],
      representativeId: json['representativeId'] ?? '',
      representativeName: json['representativeName'] ?? 'Field Representative',
      scheduledDateUtc: json['scheduledDateUtc'] ?? '',
      completedDateUtc: json['completedDateUtc'],
      status: json['statusName'] ?? json['status'] ?? 'Scheduled',
      overallAssessment: json['overallAssessment'],
      findings: rawFindings
          .map((e) => InspectionFindingModel.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

class InspectionFindingModel {
  final String id;
  final String area;
  final String issueDescription;
  final String severity;
  final String? recommendation;
  final double? estimatedRepairCost;

  InspectionFindingModel({
    required this.id,
    required this.area,
    required this.issueDescription,
    required this.severity,
    this.recommendation,
    this.estimatedRepairCost,
  });

  factory InspectionFindingModel.fromJson(Map<String, dynamic> json) {
    return InspectionFindingModel(
      id: json['id'] ?? '',
      area: json['area'] ?? '',
      issueDescription: json['issueDescription'] ?? '',
      severity: json['severity'] ?? 'Medium',
      recommendation: json['recommendation'],
      estimatedRepairCost: (json['estimatedRepairCost'] as num?)?.toDouble(),
    );
  }
}
