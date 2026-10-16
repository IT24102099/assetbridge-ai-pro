import '../../../core/networking/api_client.dart';
import '../../../core/networking/api_endpoints.dart';
import '../../../shared/models/api_response.dart';
import '../../../shared/models/paged_response.dart';
import '../models/property_workflow_assistant_model.dart';
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
    final body = {
      'reason': revisionReason,
      'changesRequested': revisionReason,
      'revisionReason': revisionReason,
    };
    await _apiClient.post(ApiEndpoints.requestWorkflowRevision(workflowId), body: body);
  }

  Future<List<AgentRunModel>> getAgentRuns(String workflowId) async {
    final json = await _apiClient.get(ApiEndpoints.workflowAgentRuns(workflowId));
    final apiResponse = ApiResponse<List<dynamic>>.fromJson(
      json,
      (data) => data as List<dynamic>,
    );

    if (apiResponse.success && apiResponse.data != null) {
      return apiResponse.data!
          .map((item) => AgentRunModel.fromJson(item as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  Future<void> sendProposalToOwner(String workflowId, {String? quotationId, String? proposalNotes}) async {
    final body = {
      'quotationId': quotationId,
      'proposalNotes': proposalNotes,
    };
    await _apiClient.post(ApiEndpoints.sendProposal(workflowId), body: body);
  }

  Future<void> processOwnerDecision(String workflowId, {required String decision, String? rejectionReason, String? comments}) async {
    final body = {
      'decision': decision,
      'rejectionReason': rejectionReason,
      'comments': comments,
    };
    await _apiClient.post(ApiEndpoints.ownerDecision(workflowId), body: body);
  }

  Future<List<Map<String, dynamic>>> getRejectionAlternatives(String workflowId) async {
    final json = await _apiClient.get(ApiEndpoints.rejectionAlternatives(workflowId));
    final apiResponse = ApiResponse<List<dynamic>>.fromJson(
      json,
      (data) => data as List<dynamic>,
    );
    if (apiResponse.success && apiResponse.data != null) {
      return apiResponse.data!.map((item) => item as Map<String, dynamic>).toList();
    }
    return [];
  }

  Future<List<ProposalAlternativeModel>> getTypedRejectionAlternatives(String workflowId) async {
    final json = await _apiClient.get(ApiEndpoints.rejectionAlternatives(workflowId));
    final apiResponse = ApiResponse<List<dynamic>>.fromJson(
      json,
      (data) => data as List<dynamic>,
    );
    if (apiResponse.success && apiResponse.data != null) {
      return apiResponse.data!
          .map((item) => ProposalAlternativeModel.fromJson(item as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  Future<PropertyWorkflowAssistantModel> getPropertyWorkflowAssistant(String assetId) async {
    final json = await _apiClient.get(ApiEndpoints.propertyAssistant(assetId));
    final apiResponse = ApiResponse<PropertyWorkflowAssistantModel>.fromJson(
      json,
      (data) => PropertyWorkflowAssistantModel.fromJson(data as Map<String, dynamic>),
    );

    if (apiResponse.success && apiResponse.data != null) {
      return apiResponse.data!;
    }
    throw Exception(apiResponse.message.isNotEmpty ? apiResponse.message : 'Failed to fetch property workflow assistant intelligence.');
  }
}
