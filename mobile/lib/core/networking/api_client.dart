import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/app_config.dart';
import '../storage/token_storage.dart';
import 'api_exception.dart';

class ApiClient {
  final http.Client _client = http.Client();

  Future<Map<String, String>> _getHeaders() async {
    final token = await TokenStorage.getToken();
    final headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  Uri _buildUri(String path, [Map<String, dynamic>? queryParams]) {
    final fullUrl = '${AppConfig.baseUrl}$path';
    if (queryParams == null || queryParams.isEmpty) {
      return Uri.parse(fullUrl);
    }
    final normalizedParams = queryParams.map((k, v) => MapEntry(k, v.toString()));
    return Uri.parse(fullUrl).replace(queryParameters: normalizedParams);
  }

  Future<dynamic> get(String path, {Map<String, dynamic>? queryParams}) async {
    try {
      final uri = _buildUri(path, queryParams);
      final headers = await _getHeaders();
      final response = await _client.get(uri, headers: headers).timeout(
            const Duration(seconds: 15),
          );
      return _handleResponse(response);
    } catch (e) {
      _handleError(e);
    }
  }

  Future<dynamic> post(String path, {dynamic body}) async {
    try {
      final uri = _buildUri(path);
      final headers = await _getHeaders();
      final response = await _client
          .post(
            uri,
            headers: headers,
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(const Duration(seconds: 15));
      return _handleResponse(response);
    } catch (e) {
      _handleError(e);
    }
  }

  Future<dynamic> put(String path, {dynamic body}) async {
    try {
      final uri = _buildUri(path);
      final headers = await _getHeaders();
      final response = await _client
          .put(
            uri,
            headers: headers,
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(const Duration(seconds: 15));
      return _handleResponse(response);
    } catch (e) {
      _handleError(e);
    }
  }

  Future<dynamic> delete(String path) async {
    try {
      final uri = _buildUri(path);
      final headers = await _getHeaders();
      final response = await _client.delete(uri, headers: headers).timeout(
            const Duration(seconds: 15),
          );
      return _handleResponse(response);
    } catch (e) {
      _handleError(e);
    }
  }

  dynamic _handleResponse(http.Response response) {
    dynamic decoded;
    try {
      decoded = jsonDecode(response.body);
    } catch (_) {
      decoded = null;
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return decoded;
    }

    String errorMessage = 'Request failed with status code ${response.statusCode}';
    Map<String, dynamic>? errors;

    if (decoded is Map<String, dynamic>) {
      if (decoded.containsKey('message') && decoded['message'] != null) {
        errorMessage = decoded['message'].toString();
      } else if (decoded.containsKey('title') && decoded['title'] != null) {
        errorMessage = decoded['title'].toString();
      }
      if (decoded.containsKey('errors')) {
        errors = decoded['errors'] as Map<String, dynamic>?;
      }
    }

    throw ApiException(
      message: errorMessage,
      statusCode: response.statusCode,
      errors: errors,
    );
  }

  void _handleError(dynamic error) {
    if (error is ApiException) {
      throw error;
    }
    throw ApiException(
      message: 'Network error or server unreachable: ${error.toString()}',
    );
  }
}
