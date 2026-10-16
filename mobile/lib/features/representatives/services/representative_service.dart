import 'dart:io';
import '../../../core/networking/api_client.dart';
import '../../../core/networking/api_endpoints.dart';
import '../../../shared/models/paged_response.dart';
import '../models/representative_document_model.dart';
import '../models/representative_model.dart';

class RepresentativeService {
  final ApiClient _apiClient = ApiClient();

  Future<PagedResponse<RepresentativeModel>> getRepresentatives({
    String? search,
    String? district,
    String? verificationStatus,
    int page = 1,
    int pageSize = 20,
  }) async {
    final queryParams = <String, dynamic>{
      'pageNumber': page,
      'pageSize': pageSize,
    };
    if (search != null && search.isNotEmpty) queryParams['search'] = search;
    if (district != null && district.isNotEmpty) queryParams['district'] = district;
    if (verificationStatus != null && verificationStatus.isNotEmpty) {
      queryParams['verificationStatus'] = verificationStatus;
    }

    final res = await _apiClient.get(
      ApiEndpoints.representatives,
      queryParams: queryParams,
    );

    final data = res['data'];
    if (data is Map<String, dynamic>) {
      final items = (data['items'] as List<dynamic>?)
              ?.map((e) => RepresentativeModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [];
      final totalCount = (data['totalCount'] as num?)?.toInt() ?? items.length;
      final totalPages = (data['totalPages'] as num?)?.toInt() ?? 1;
      return PagedResponse(
        items: items,
        totalCount: totalCount,
        totalPages: totalPages,
        pageNumber: (data['pageNumber'] as num?)?.toInt() ?? page,
        pageSize: (data['pageSize'] as num?)?.toInt() ?? pageSize,
        hasPreviousPage: (data['hasPreviousPage'] as bool?) ?? false,
        hasNextPage: (data['hasNextPage'] as bool?) ?? false,
      );
    } else if (data is List<dynamic>) {
      final items = data
          .map((e) => RepresentativeModel.fromJson(e as Map<String, dynamic>))
          .toList();
      return PagedResponse(
        items: items,
        totalCount: items.length,
        totalPages: 1,
        pageNumber: page,
        pageSize: pageSize,
        hasPreviousPage: false,
        hasNextPage: false,
      );
    }

    return PagedResponse(
      items: [],
      totalCount: 0,
      totalPages: 1,
      pageNumber: page,
      pageSize: pageSize,
      hasPreviousPage: false,
      hasNextPage: false,
    );
  }

  Future<RepresentativeModel> getRepresentativeById(String id) async {
    final res = await _apiClient.get(ApiEndpoints.representativeDetails(id));
    final data = res['data'] ?? res;
    return RepresentativeModel.fromJson(data as Map<String, dynamic>);
  }

  Future<RepresentativeModel?> getCurrentRepresentativeProfile() async {
    try {
      final res = await _apiClient.get(ApiEndpoints.representativeMe);
      final data = res['data'] ?? res;
      if (data is Map<String, dynamic>) {
        return RepresentativeModel.fromJson(data);
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  Future<List<RepresentativeDocumentModel>> getVerificationDocuments(
      String representativeId) async {
    final res = await _apiClient.get(
      ApiEndpoints.representativeDocuments(representativeId),
    );
    final data = res['data'] ?? res;
    if (data is List<dynamic>) {
      return data
          .map((e) => RepresentativeDocumentModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  Future<RepresentativeDocumentModel> uploadVerificationDocument({
    required String representativeId,
    required File file,
    required String documentType,
    String? notes,
  }) async {
    final additionalFields = <String, String>{
      'documentType': documentType,
    };
    if (notes != null && notes.isNotEmpty) {
      additionalFields['notes'] = notes;
    }

    final res = await _apiClient.uploadFile(
      ApiEndpoints.representativeDocuments(representativeId),
      file: file,
      fileField: 'file',
      additionalFields: additionalFields,
    );

    final data = res['data'] ?? res;
    return RepresentativeDocumentModel.fromJson(data as Map<String, dynamic>);
  }

  Future<RepresentativeDocumentModel> reviewVerificationDocument({
    required String representativeId,
    required String documentId,
    required String status,
    String? notes,
  }) async {
    final res = await _apiClient.patch(
      ApiEndpoints.representativeDocumentReview(representativeId, documentId),
      body: {
        'status': status,
        if (notes != null) 'notes': notes,
      },
    );
    final data = res['data'] ?? res;
    return RepresentativeDocumentModel.fromJson(data as Map<String, dynamic>);
  }

  Future<RepresentativeModel> updateVerificationStatus({
    required String representativeId,
    required String status,
    String? notes,
  }) async {
    final res = await _apiClient.patch(
      ApiEndpoints.representativeVerification(representativeId),
      body: {
        'status': status,
        if (notes != null) 'notes': notes,
      },
    );
    final data = res['data'] ?? res;
    return RepresentativeModel.fromJson(data as Map<String, dynamic>);
  }
}
