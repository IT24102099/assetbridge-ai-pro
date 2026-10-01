import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../config/app_config.dart';
import '../storage/token_storage.dart';
import 'api_exception.dart';

class ApiClient {
  final http.Client _client = http.Client();
  static const Duration _defaultTimeout = Duration(seconds: 45);

  Future<Map<String, String>> _getHeaders({bool isMultipart = false}) async {
    final token = await TokenStorage.getToken();
    final headers = <String, String>{
      'Accept': 'application/json',
    };
    if (!isMultipart) {
      headers['Content-Type'] = 'application/json';
    }
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  Uri _buildUri(String path, [Map<String, dynamic>? queryParams]) {
    final cleanPath = path.startsWith('/') ? path : '/$path';
    final fullUrl = '${AppConfig.baseUrl}$cleanPath';
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
      final response = await _client.get(uri, headers: headers).timeout(_defaultTimeout);
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
          .timeout(_defaultTimeout);
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
          .timeout(_defaultTimeout);
      return _handleResponse(response);
    } catch (e) {
      _handleError(e);
    }
  }

  Future<dynamic> patch(String path, {dynamic body}) async {
    try {
      final uri = _buildUri(path);
      final headers = await _getHeaders();
      final response = await _client
          .patch(
            uri,
            headers: headers,
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(_defaultTimeout);
      return _handleResponse(response);
    } catch (e) {
      _handleError(e);
    }
  }

  Future<dynamic> delete(String path) async {
    try {
      final uri = _buildUri(path);
      final headers = await _getHeaders();
      final response = await _client.delete(uri, headers: headers).timeout(_defaultTimeout);
      return _handleResponse(response);
    } catch (e) {
      _handleError(e);
    }
  }

  Future<dynamic> uploadFile(
    String path, {
    required File file,
    required String fileField,
    Map<String, String>? additionalFields,
  }) async {
    try {
      final uri = _buildUri(path);
      final headers = await _getHeaders(isMultipart: true);
      final request = http.MultipartRequest('POST', uri)
        ..headers.addAll(headers);

      if (additionalFields != null) {
        request.fields.addAll(additionalFields);
      }

      request.files.add(await http.MultipartFile.fromPath(fileField, file.path));

      final streamedResponse = await request.send().timeout(_defaultTimeout);
      final response = await http.Response.fromStream(streamedResponse);
      return _handleResponse(response);
    } catch (e) {
      _handleError(e);
    }
  }

  static void Function()? onUnauthorized;

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

    if (response.statusCode == 401) {
      TokenStorage.clear();
      onUnauthorized?.call();
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
      message: 'Network connection issue or server waking up. Please try again: ${error.toString()}',
    );
  }
}
