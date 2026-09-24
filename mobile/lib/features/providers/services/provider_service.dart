import '../../../core/networking/api_client.dart';
import '../../../core/networking/api_endpoints.dart';
import '../../../shared/models/api_response.dart';
import '../../../shared/models/paged_response.dart';
import '../models/provider_model.dart';

class ProviderService {
  final ApiClient _apiClient = ApiClient();

  Future<PagedResponse<ProviderModel>> getProviders({
    int page = 1,
    int pageSize = 20,
    String? category,
    String? city,
  }) async {
    final params = <String, dynamic>{
      'pageNumber': page,
      'pageSize': pageSize,
    };
    if (category != null && category.isNotEmpty) params['category'] = category;
    if (city != null && city.isNotEmpty) params['city'] = city;

    final json = await _apiClient.get(ApiEndpoints.providers, queryParams: params);
    final apiResponse = ApiResponse<PagedResponse<ProviderModel>>.fromJson(
      json,
      (data) => PagedResponse<ProviderModel>.fromJson(
        data as Map<String, dynamic>,
        (item) => ProviderModel.fromJson(item as Map<String, dynamic>),
      ),
    );

    if (apiResponse.success && apiResponse.data != null) {
      return apiResponse.data!;
    }
    throw Exception(apiResponse.message.isNotEmpty ? apiResponse.message : 'Failed to fetch providers.');
  }
}
