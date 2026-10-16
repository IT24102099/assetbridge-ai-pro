import '../../../core/networking/api_client.dart';
import '../../../core/networking/api_endpoints.dart';
import '../../../shared/models/api_response.dart';
import '../../../shared/models/paged_response.dart';
import '../models/quotation_model.dart';

class QuotationService {
  final ApiClient _apiClient = ApiClient();

  Future<PagedResponse<QuotationModel>> getQuotations({
    int page = 1,
    int pageSize = 20,
    String? incidentId,
  }) async {
    final params = <String, dynamic>{
      'pageNumber': page,
      'pageSize': pageSize,
    };
    if (incidentId != null) params['incidentId'] = incidentId;

    final json = await _apiClient.get(ApiEndpoints.quotations, queryParams: params);
    final apiResponse = ApiResponse<PagedResponse<QuotationModel>>.fromJson(
      json,
      (data) => PagedResponse<QuotationModel>.fromJson(
        data as Map<String, dynamic>,
        (item) => QuotationModel.fromJson(item as Map<String, dynamic>),
      ),
    );

    if (apiResponse.success && apiResponse.data != null) {
      return apiResponse.data!;
    }
    throw Exception(
        apiResponse.message.isNotEmpty ? apiResponse.message : 'Failed to fetch quotations.');
  }

  Future<QuotationModel> getQuotationById(String id) async {
    final json = await _apiClient.get(ApiEndpoints.quotationDetails(id));
    final data = json['data'] ?? json;
    return QuotationModel.fromJson(data as Map<String, dynamic>);
  }

  Future<QuotationModel> updateQuotationStatus(String id, String status) async {
    final json = await _apiClient.patch(
      '${ApiEndpoints.quotations}/$id/status',
      body: {'status': status},
    );
    final data = json['data'] ?? json;
    return QuotationModel.fromJson(data as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> checkBudget({
    required String incidentId,
    required double quotationAmount,
  }) async {
    final json = await _apiClient.post(
      '${ApiEndpoints.quotations}/check-budget',
      body: {
        'incidentId': incidentId,
        'quotationAmount': quotationAmount,
      },
    );
    return (json['data'] as Map<String, dynamic>?) ?? {};
  }
}
