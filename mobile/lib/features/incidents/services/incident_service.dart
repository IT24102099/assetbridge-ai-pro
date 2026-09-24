import '../../../core/networking/api_client.dart';
import '../../../core/networking/api_endpoints.dart';
import '../../../shared/models/api_response.dart';
import '../../../shared/models/paged_response.dart';
import '../models/incident_model.dart';

class IncidentService {
  final ApiClient _apiClient = ApiClient();

  Future<PagedResponse<IncidentModel>> getIncidents({
    int page = 1,
    int pageSize = 20,
    String? status,
    String? priority,
  }) async {
    final params = <String, dynamic>{
      'pageNumber': page,
      'pageSize': pageSize,
    };
    if (status != null && status != 'all') params['status'] = status;
    if (priority != null && priority != 'all') params['priority'] = priority;

    final json = await _apiClient.get(ApiEndpoints.incidents, queryParams: params);
    final apiResponse = ApiResponse<PagedResponse<IncidentModel>>.fromJson(
      json,
      (data) => PagedResponse<IncidentModel>.fromJson(
        data as Map<String, dynamic>,
        (item) => IncidentModel.fromJson(item as Map<String, dynamic>),
      ),
    );

    if (apiResponse.success && apiResponse.data != null) {
      return apiResponse.data!;
    }
    throw Exception(apiResponse.message.isNotEmpty ? apiResponse.message : 'Failed to fetch incidents.');
  }

  Future<IncidentModel> getIncidentById(String id) async {
    final json = await _apiClient.get(ApiEndpoints.incidentDetails(id));
    final apiResponse = ApiResponse<IncidentModel>.fromJson(
      json,
      (data) => IncidentModel.fromJson(data as Map<String, dynamic>),
    );

    if (apiResponse.success && apiResponse.data != null) {
      return apiResponse.data!;
    }
    throw Exception(apiResponse.message.isNotEmpty ? apiResponse.message : 'Failed to fetch incident details.');
  }

  Future<IncidentModel> createIncident(CreateIncidentRequest request) async {
    final json = await _apiClient.post(ApiEndpoints.incidents, body: request.toJson());
    final apiResponse = ApiResponse<IncidentModel>.fromJson(
      json,
      (data) => IncidentModel.fromJson(data as Map<String, dynamic>),
    );

    if (apiResponse.success && apiResponse.data != null) {
      return apiResponse.data!;
    }
    throw Exception(apiResponse.message.isNotEmpty ? apiResponse.message : 'Failed to report incident.');
  }

  Future<void> addEvidence(String incidentId, String fileUrl, String fileName, String caption) async {
    final body = {
      'fileUrl': fileUrl,
      'fileName': fileName,
      'fileSizeBytes': 1024 * 500,
      'evidenceType': 'Photo',
      'caption': caption,
    };
    await _apiClient.post(ApiEndpoints.incidentEvidence(incidentId), body: body);
  }
}
