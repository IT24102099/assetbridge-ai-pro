import '../../../core/networking/api_client.dart';
import '../../../core/networking/api_endpoints.dart';
import '../models/notification_model.dart';

class NotificationService {
  final ApiClient _apiClient = ApiClient();

  Future<List<NotificationModel>> getNotifications({int limit = 20}) async {
    final res = await _apiClient.get(
      ApiEndpoints.notifications,
      queryParams: {'limit': limit},
    );
    final data = res['data'] ?? res;
    if (data is List<dynamic>) {
      return data
          .map((e) => NotificationModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  Future<int> getUnreadCount() async {
    try {
      final res = await _apiClient.get('${ApiEndpoints.notifications}/unread-count');
      final data = res['data'] ?? res;
      if (data is int) return data;
      if (data is num) return data.toInt();
      return 0;
    } catch (_) {
      return 0;
    }
  }

  Future<bool> markAsRead(String id) async {
    try {
      await _apiClient.patch('${ApiEndpoints.notifications}/$id/read');
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<bool> markAllAsRead() async {
    try {
      await _apiClient.patch('${ApiEndpoints.notifications}/read-all');
      return true;
    } catch (_) {
      return false;
    }
  }
}
