import '../../../core/networking/api_client.dart';
import '../../../core/networking/api_endpoints.dart';
import '../../../shared/models/api_response.dart';
import '../../../shared/models/paged_response.dart';
import '../models/asset_model.dart';

class AssetService {
  final ApiClient _apiClient = ApiClient();

  Future<PagedResponse<AssetModel>> getAssets({
    int page = 1,
    int pageSize = 20,
    String? searchQuery,
    String? city,
  }) async {
    final params = <String, dynamic>{
      'pageNumber': page,
      'pageSize': pageSize,
    };
    if (searchQuery != null && searchQuery.isNotEmpty) {
      params['search'] = searchQuery;
    }
    if (city != null && city.isNotEmpty) {
      params['city'] = city;
    }

    final json = await _apiClient.get(ApiEndpoints.assets, queryParams: params);
    final apiResponse = ApiResponse<PagedResponse<AssetModel>>.fromJson(
      json,
      (data) => PagedResponse<AssetModel>.fromJson(
        data as Map<String, dynamic>,
        (item) => AssetModel.fromJson(item as Map<String, dynamic>),
      ),
    );

    if (apiResponse.success && apiResponse.data != null) {
      return apiResponse.data!;
    }
    throw Exception(apiResponse.message.isNotEmpty ? apiResponse.message : 'Failed to fetch assets.');
  }

  Future<AssetModel> getAssetById(String id) async {
    final json = await _apiClient.get(ApiEndpoints.assetDetails(id));
    final apiResponse = ApiResponse<AssetModel>.fromJson(
      json,
      (data) => AssetModel.fromJson(data as Map<String, dynamic>),
    );

    if (apiResponse.success && apiResponse.data != null) {
      return apiResponse.data!;
    }
    throw Exception(apiResponse.message.isNotEmpty ? apiResponse.message : 'Failed to fetch asset details.');
  }
}
