class MaintenanceJobModel {
  final String id;
  final String assetId;
  final String assetName;
  final String incidentId;
  final String incidentTitle;
  final String providerId;
  final String providerName;
  final String title;
  final String description;
  final String status;
  final double agreedCost;
  final String? startDateUtc;
  final String? completionDateUtc;

  MaintenanceJobModel({
    required this.id,
    required this.assetId,
    required this.assetName,
    required this.incidentId,
    required this.incidentTitle,
    required this.providerId,
    required this.providerName,
    required this.title,
    required this.description,
    required this.status,
    required this.agreedCost,
    this.startDateUtc,
    this.completionDateUtc,
  });

  factory MaintenanceJobModel.fromJson(Map<String, dynamic> json) {
    return MaintenanceJobModel(
      id: json['id'] ?? '',
      assetId: json['assetId'] ?? '',
      assetName: json['assetName'] ?? 'Property',
      incidentId: json['incidentId'] ?? '',
      incidentTitle: json['incidentTitle'] ?? 'Repair Task',
      providerId: json['providerId'] ?? '',
      providerName: json['providerName'] ?? json['serviceProviderName'] ?? 'Contractor',
      title: json['title'] ?? 'Maintenance Work Order',
      description: json['description'] ?? '',
      status: json['statusName'] ?? json['status'] ?? 'Assigned',
      agreedCost: (json['agreedCost'] as num?)?.toDouble() ?? 0,
      startDateUtc: json['startDateUtc'],
      completionDateUtc: json['completionDateUtc'],
    );
  }
}
