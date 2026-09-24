import '../../../core/networking/api_client.dart';
import '../../../core/networking/api_endpoints.dart';
import '../../../shared/models/api_response.dart';
import '../../../shared/models/paged_response.dart';
import '../models/maintenance_model.dart';

class MaintenanceService {
  final ApiClient _apiClient = ApiClient();

  Future<PagedResponse<MaintenanceJobModel>> getJobs({
    int page = 1,
    int pageSize = 20,
    String? status,
  }) async {
    final params = <String, dynamic>{
      'pageNumber': page,
      'pageSize': pageSize,
    };
    if (status != null && status != 'all') params['status'] = status;

    final json = await _apiClient.get(ApiEndpoints.maintenanceJobs, queryParams: params);
    final apiResponse = ApiResponse<PagedResponse<MaintenanceJobModel>>.fromJson(
      json,
      (data) => PagedResponse<MaintenanceJobModel>.fromJson(
        data as Map<String, dynamic>,
        (item) => MaintenanceJobModel.fromJson(item as Map<String, dynamic>),
      ),
    );

    if (apiResponse.success && apiResponse.data != null) {
      return apiResponse.data!;
    }
    throw Exception(apiResponse.message.isNotEmpty ? apiResponse.message : 'Failed to fetch maintenance jobs.');
  }
}
