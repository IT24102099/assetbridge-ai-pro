class NotificationModel {
  final String id;
  final String userId;
  final String title;
  final String message;
  final String typeName;
  final bool isRead;
  final String? relatedWorkflowInstanceId;
  final DateTime createdAtUtc;

  NotificationModel({
    required this.id,
    required this.userId,
    required this.title,
    required this.message,
    required this.typeName,
    required this.isRead,
    this.relatedWorkflowInstanceId,
    required this.createdAtUtc,
  });

  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    return NotificationModel(
      id: json['id']?.toString() ?? '',
      userId: json['userId']?.toString() ?? '',
      title: json['title'] ?? 'Notification',
      message: json['message'] ?? '',
      typeName: json['typeName'] ?? json['type']?.toString() ?? 'General',
      isRead: json['isRead'] ?? false,
      relatedWorkflowInstanceId: json['relatedWorkflowInstanceId']?.toString(),
      createdAtUtc: json['createdAtUtc'] != null
          ? DateTime.tryParse(json['createdAtUtc']) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}
