class MaintenanceJobModel {
  final String id;
  final String assetId;
  final String assetName;
  final String incidentId;
  final String incidentTitle;
  final String providerId;
  final String providerName;
  final String? inspectionId;
  final String title;
  final String description;
  final String status;
  final double agreedCost; // ApprovedBudget
  final double? actualCost;
  final String? startDateUtc;
  final String? completionDateUtc;
  final String? scheduledStartUtc;
  final String? scheduledEndUtc;
  final String? completionNotes;

  MaintenanceJobModel({
    required this.id,
    required this.assetId,
    required this.assetName,
    required this.incidentId,
    required this.incidentTitle,
    required this.providerId,
    required this.providerName,
    this.inspectionId,
    required this.title,
    required this.description,
    required this.status,
    required this.agreedCost,
    this.actualCost,
    this.startDateUtc,
    this.completionDateUtc,
    this.scheduledStartUtc,
    this.scheduledEndUtc,
    this.completionNotes,
  });

  factory MaintenanceJobModel.fromJson(Map<String, dynamic> json) {
    final approvedBudget = (json['approvedBudget'] as num?)?.toDouble() ??
        (json['agreedCost'] as num?)?.toDouble() ??
        0.0;
    final actualCost = (json['actualCost'] as num?)?.toDouble();

    return MaintenanceJobModel(
      id: json['id']?.toString() ?? '',
      assetId: json['assetId']?.toString() ?? '',
      assetName: json['assetName'] ?? 'Target Property',
      incidentId: json['incidentId']?.toString() ?? '',
      incidentTitle: json['incidentTitle'] ?? 'Maintenance Request',
      providerId: json['providerId']?.toString() ?? '',
      providerName: json['providerBusinessName'] ??
          json['providerName'] ??
          json['serviceProviderName'] ??
          'Contractor',
      inspectionId: json['inspectionId']?.toString(),
      title: json['title'] ?? 'Maintenance Work Order',
      description: json['description'] ?? '',
      status: json['statusName'] ?? json['status'] ?? 'Scheduled',
      agreedCost: approvedBudget,
      actualCost: actualCost,
      startDateUtc: json['startDateUtc'] ?? json['scheduledStartUtc'],
      completionDateUtc: json['completionDateUtc'] ?? json['completedAtUtc'],
      scheduledStartUtc: json['scheduledStartUtc'],
      scheduledEndUtc: json['scheduledEndUtc'],
      completionNotes: json['completionNotes'],
    );
  }
}
