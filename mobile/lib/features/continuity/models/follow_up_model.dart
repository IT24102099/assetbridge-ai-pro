class FollowUpModel {
  final String id;
  final String assetId;
  final String assetName;
  final String? workflowId;
  final String title;
  final String description;
  final String dueDateUtc;
  final String priority;
  final String status;
  final String? assignedToUserId;
  final String? assignedToUserName;
  final String? completedDateUtc;

  FollowUpModel({
    required this.id,
    required this.assetId,
    required this.assetName,
    this.workflowId,
    required this.title,
    required this.description,
    required this.dueDateUtc,
    required this.priority,
    required this.status,
    this.assignedToUserId,
    this.assignedToUserName,
    this.completedDateUtc,
  });

  factory FollowUpModel.fromJson(Map<String, dynamic> json) {
    return FollowUpModel(
      id: json['id'] ?? '',
      assetId: json['assetId'] ?? '',
      assetName: json['assetName'] ?? 'Property',
      workflowId: json['workflowId'],
      title: json['title'] ?? 'Warranty Checkup',
      description: json['description'] ?? '',
      dueDateUtc: json['dueDateUtc'] ?? '',
      priority: json['priorityName'] ?? json['priority'] ?? 'Medium',
      status: json['statusName'] ?? json['status'] ?? 'Pending',
      assignedToUserId: json['assignedToUserId'],
      assignedToUserName: json['assignedToUserName'],
      completedDateUtc: json['completedDateUtc'],
    );
  }
}
