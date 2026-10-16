import '../../../core/networking/api_client.dart';
import '../../../core/networking/api_endpoints.dart';
import '../../../shared/models/api_response.dart';
import '../../../shared/models/paged_response.dart';
import '../models/inspection_model.dart';

class InspectionService {
  final ApiClient _apiClient = ApiClient();

  Future<PagedResponse<InspectionModel>> getInspections({
    int page = 1,
    int pageSize = 20,
    String? status,
  }) async {
    final params = <String, dynamic>{
      'pageNumber': page,
      'pageSize': pageSize,
    };
    if (status != null && status != 'all') params['status'] = status;

    final json = await _apiClient.get(ApiEndpoints.inspections, queryParams: params);
    final apiResponse = ApiResponse<PagedResponse<InspectionModel>>.fromJson(
      json,
      (data) => PagedResponse<InspectionModel>.fromJson(
        data as Map<String, dynamic>,
        (item) => InspectionModel.fromJson(item as Map<String, dynamic>),
      ),
    );

    if (apiResponse.success && apiResponse.data != null) {
      return apiResponse.data!;
    }
    throw Exception(
        apiResponse.message.isNotEmpty ? apiResponse.message : 'Failed to fetch inspections.');
  }

  Future<InspectionModel> getInspectionById(String id) async {
    final json = await _apiClient.get(ApiEndpoints.inspectionDetails(id));
    final data = json['data'] ?? json;
    return InspectionModel.fromJson(data as Map<String, dynamic>);
  }

  Future<List<InspectionFindingModel>> getFindings(String inspectionId) async {
    final json = await _apiClient.get(ApiEndpoints.inspectionFindings(inspectionId));
    final data = json['data'] ?? json;
    if (data is List<dynamic>) {
      return data
          .map((e) => InspectionFindingModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  Future<InspectionFindingModel> addFinding(
    String inspectionId, {
    required String area,
    required String description,
    required String severity,
    String? recommendation,
    double? repairCost,
  }) async {
    final json = await _apiClient.post(
      ApiEndpoints.inspectionFindings(inspectionId),
      body: {
        'area': area,
        'issueDescription': description,
        'severity': severity,
        if (recommendation != null) 'recommendation': recommendation,
        if (repairCost != null) 'estimatedRepairCost': repairCost,
      },
    );
    final data = json['data'] ?? json;
    return InspectionFindingModel.fromJson(data as Map<String, dynamic>);
  }

  Future<InspectionModel> updateStatus(
    String inspectionId,
    String status, {
    String? notes,
  }) async {
    final json = await _apiClient.patch(
      '${ApiEndpoints.inspections}/$inspectionId/status',
      body: {
        'status': status,
        if (notes != null) 'notes': notes,
      },
    );
    final data = json['data'] ?? json;
    return InspectionModel.fromJson(data as Map<String, dynamic>);
  }
}
