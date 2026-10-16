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
    String? search,
  }) async {
    final params = <String, dynamic>{
      'pageNumber': page,
      'pageSize': pageSize,
    };
    if (status != null && status != 'all') params['status'] = status;
    if (search != null && search.isNotEmpty) params['search'] = search;

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
    throw Exception(
        apiResponse.message.isNotEmpty ? apiResponse.message : 'Failed to fetch maintenance jobs.');
  }

  Future<MaintenanceJobModel> getJobById(String id) async {
    final json = await _apiClient.get(ApiEndpoints.maintenanceJobDetails(id));
    final data = json['data'] ?? json;
    return MaintenanceJobModel.fromJson(data as Map<String, dynamic>);
  }

  Future<MaintenanceJobModel> updateJobStatus(
    String id, {
    required String status,
    double? actualCost,
    String? completionNotes,
  }) async {
    final json = await _apiClient.patch(
      ApiEndpoints.maintenanceJobStatus(id),
      body: {
        'status': status,
        if (actualCost != null) 'actualCost': actualCost,
        if (completionNotes != null) 'completionNotes': completionNotes,
        if (status.toLowerCase() == 'completed')
          'completedAtUtc': DateTime.now().toUtc().toIso8601String(),
      },
    );
    final data = json['data'] ?? json;
    return MaintenanceJobModel.fromJson(data as Map<String, dynamic>);
  }
}
