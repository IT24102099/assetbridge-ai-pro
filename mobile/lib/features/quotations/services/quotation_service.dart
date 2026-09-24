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
    throw Exception(apiResponse.message.isNotEmpty ? apiResponse.message : 'Failed to fetch quotations.');
  }
}
