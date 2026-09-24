import '../../../core/networking/api_client.dart';
import '../../../core/networking/api_endpoints.dart';
import '../../../shared/models/api_response.dart';
import '../../../shared/models/paged_response.dart';
import '../models/follow_up_model.dart';

class FollowUpService {
  final ApiClient _apiClient = ApiClient();

  Future<PagedResponse<FollowUpModel>> getFollowUps({
    int page = 1,
    int pageSize = 20,
    String? status,
  }) async {
    final params = <String, dynamic>{
      'pageNumber': page,
      'pageSize': pageSize,
    };
    if (status != null && status != 'all') params['status'] = status;

    final json = await _apiClient.get(ApiEndpoints.followUps, queryParams: params);
    final apiResponse = ApiResponse<PagedResponse<FollowUpModel>>.fromJson(
      json,
      (data) => PagedResponse<FollowUpModel>.fromJson(
        data as Map<String, dynamic>,
        (item) => FollowUpModel.fromJson(item as Map<String, dynamic>),
      ),
    );

    if (apiResponse.success && apiResponse.data != null) {
      return apiResponse.data!;
    }
    throw Exception(apiResponse.message.isNotEmpty ? apiResponse.message : 'Failed to fetch continuity tasks.');
  }

  Future<void> updateStatus(String id, String status, String? notes) async {
    final body = {
      'status': status,
      'completionNotes': notes,
    };
    await _apiClient.put(ApiEndpoints.followUpStatus(id), body: body);
  }
}
