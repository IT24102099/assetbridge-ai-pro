class IncidentModel {
  final String id;
  final String assetId;
  final String assetName;
  final String? assetCity;
  final String reportedByUserId;
  final String reportedByUserName;
  final String title;
  final String description;
  final String category;
  final String priority;
  final String status;
  final double? estimatedBudget;
  final String? requiredByUtc;
  final String? locationDetails;
  final int evidenceCount;
  final List<IncidentEvidenceModel> evidence;
  final String? createdAtUtc;
  final String? updatedAtUtc;

  IncidentModel({
    required this.id,
    required this.assetId,
    required this.assetName,
    this.assetCity,
    required this.reportedByUserId,
    required this.reportedByUserName,
    required this.title,
    required this.description,
    required this.category,
    required this.priority,
    required this.status,
    this.estimatedBudget,
    this.requiredByUtc,
    this.locationDetails,
    this.evidenceCount = 0,
    this.evidence = const [],
    this.createdAtUtc,
    this.updatedAtUtc,
  });

  factory IncidentModel.fromJson(Map<String, dynamic> json) {
    final rawEvidence = json['evidence'] as List<dynamic>? ?? [];
    return IncidentModel(
      id: json['id'] ?? '',
      assetId: json['assetId'] ?? '',
      assetName: json['assetName'] ?? '',
      assetCity: json['assetCity'],
      reportedByUserId: json['reportedByUserId'] ?? '',
      reportedByUserName: json['reportedByUserName'] ?? '',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      category: json['categoryName'] ?? json['category'] ?? 'General',
      priority: json['priorityName'] ?? json['priority'] ?? 'Medium',
      status: json['statusName'] ?? json['status'] ?? 'Reported',
      estimatedBudget: (json['estimatedBudget'] as num?)?.toDouble(),
      requiredByUtc: json['requiredByUtc'],
      locationDetails: json['locationDetails'],
      evidenceCount: json['evidenceCount'] ?? rawEvidence.length,
      evidence: rawEvidence
          .map((e) => IncidentEvidenceModel.fromJson(e as Map<String, dynamic>))
          .toList(),
      createdAtUtc: json['createdAtUtc'],
      updatedAtUtc: json['updatedAtUtc'],
    );
  }
}

class IncidentEvidenceModel {
  final String id;
  final String incidentId;
  final String fileUrl;
  final String fileName;
  final String evidenceType;
  final String? caption;
  final String? createdAtUtc;

  IncidentEvidenceModel({
    required this.id,
    required this.incidentId,
    required this.fileUrl,
    required this.fileName,
    required this.evidenceType,
    this.caption,
    this.createdAtUtc,
  });

  factory IncidentEvidenceModel.fromJson(Map<String, dynamic> json) {
    return IncidentEvidenceModel(
      id: json['id'] ?? '',
      incidentId: json['incidentId'] ?? '',
      fileUrl: json['fileUrl'] ?? '',
      fileName: json['fileName'] ?? '',
      evidenceType: json['evidenceType'] ?? json['evidenceTypeName'] ?? 'Photo',
      caption: json['caption'],
      createdAtUtc: json['createdAtUtc'],
    );
  }
}

class CreateIncidentRequest {
  final String assetId;
  final String title;
  final String description;
  final String category;
  final String priority;
  final double? estimatedBudget;
  final String? locationDetails;

  CreateIncidentRequest({
    required this.assetId,
    required this.title,
    required this.description,
    required this.category,
    required this.priority,
    this.estimatedBudget,
    this.locationDetails,
  });

  Map<String, dynamic> toJson() {
    return {
      'assetId': assetId,
      'title': title,
      'description': description,
      'category': category,
      'priority': priority,
      'estimatedBudget': estimatedBudget,
      'locationDetails': locationDetails,
    };
  }
}
