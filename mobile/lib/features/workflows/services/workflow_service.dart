import '../../../core/networking/api_client.dart';
import '../../../core/networking/api_endpoints.dart';
import '../../../shared/models/api_response.dart';
import '../../../shared/models/paged_response.dart';
import '../models/workflow_model.dart';

class WorkflowService {
  final ApiClient _apiClient = ApiClient();

  Future<PagedResponse<WorkflowModel>> getWorkflows({
    int page = 1,
    int pageSize = 20,
    String? state,
  }) async {
    final params = <String, dynamic>{
      'pageNumber': page,
      'pageSize': pageSize,
    };
    if (state != null && state != 'all') params['state'] = state;

    final json = await _apiClient.get(ApiEndpoints.workflows, queryParams: params);
    final apiResponse = ApiResponse<PagedResponse<WorkflowModel>>.fromJson(
      json,
      (data) => PagedResponse<WorkflowModel>.fromJson(
        data as Map<String, dynamic>,
        (item) => WorkflowModel.fromJson(item as Map<String, dynamic>),
      ),
    );

    if (apiResponse.success && apiResponse.data != null) {
      return apiResponse.data!;
    }
    throw Exception(apiResponse.message.isNotEmpty ? apiResponse.message : 'Failed to fetch workflows.');
  }

  Future<WorkflowModel> getWorkflowById(String id) async {
    final json = await _apiClient.get(ApiEndpoints.workflowDetails(id));
    final apiResponse = ApiResponse<WorkflowModel>.fromJson(
      json,
      (data) => WorkflowModel.fromJson(data as Map<String, dynamic>),
    );

    if (apiResponse.success && apiResponse.data != null) {
      return apiResponse.data!;
    }
    throw Exception(apiResponse.message.isNotEmpty ? apiResponse.message : 'Failed to fetch workflow details.');
  }

  Future<void> approveProposal(String workflowId, String? notes) async {
    final body = {'notes': notes};
    await _apiClient.post(ApiEndpoints.approveWorkflow(workflowId), body: body);
  }

  Future<void> rejectProposal(String workflowId, String reason) async {
    final body = {'reason': reason};
    await _apiClient.post(ApiEndpoints.rejectWorkflow(workflowId), body: body);
  }

  Future<void> requestChanges(String workflowId, String revisionReason) async {
    final body = {'revisionReason': revisionReason};
    await _apiClient.post(ApiEndpoints.requestWorkflowChanges(workflowId), body: body);
  }
}
