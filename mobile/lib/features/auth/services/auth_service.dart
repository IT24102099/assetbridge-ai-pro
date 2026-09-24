import 'dart:convert';
import '../../../core/networking/api_client.dart';
import '../../../core/networking/api_endpoints.dart';
import '../../../core/storage/token_storage.dart';
import '../../../shared/models/api_response.dart';
import '../../../shared/models/user_model.dart';
import '../models/login_request.dart';
import '../models/login_response.dart';

class AuthService {
  final ApiClient _apiClient = ApiClient();

  Future<LoginResponse> login(String email, String password) async {
    final body = LoginRequest(email: email.trim(), password: password).toJson();
    final json = await _apiClient.post(ApiEndpoints.login, body: body);

    final apiResponse = ApiResponse<LoginResponse>.fromJson(
      json,
      (data) => LoginResponse.fromJson(data as Map<String, dynamic>),
    );

    if (apiResponse.success && apiResponse.data != null) {
      final loginData = apiResponse.data!;
      await TokenStorage.saveToken(loginData.token);
      await TokenStorage.saveUserJson(jsonEncode(loginData.user.toJson()));
      return loginData;
    } else {
      throw Exception(apiResponse.message.isNotEmpty ? apiResponse.message : 'Login failed.');
    }
  }

  Future<UserModel> getMe() async {
    final json = await _apiClient.get(ApiEndpoints.me);
    final apiResponse = ApiResponse<UserModel>.fromJson(
      json,
      (data) => UserModel.fromJson(data as Map<String, dynamic>),
    );

    if (apiResponse.success && apiResponse.data != null) {
      final user = apiResponse.data!;
      await TokenStorage.saveUserJson(jsonEncode(user.toJson()));
      return user;
    } else {
      throw Exception(apiResponse.message.isNotEmpty ? apiResponse.message : 'Failed to retrieve profile.');
    }
  }

  Future<void> logout() async {
    await TokenStorage.clear();
  }
}
