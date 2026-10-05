import 'dart:convert';
import 'package:flutter/material.dart';
import '../../../core/networking/api_client.dart';
import '../../../core/storage/token_storage.dart';
import '../../../shared/models/user_model.dart';
import '../services/auth_service.dart';

class AuthProvider extends ChangeNotifier {
  final AuthService _authService = AuthService();

  UserModel? _user;
  String? _token;
  bool _isInitializing = true;
  bool _isLoading = false;
  String? _errorMessage;

  UserModel? get user => _user;
  String? get token => _token;
  bool get isAuthenticated => _token != null && _user != null;
  bool get isInitializing => _isInitializing;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  AuthProvider() {
    debugPrint('[AUTH_PROVIDER] constructor called');
    ApiClient.onUnauthorized = logout;
    _initializeAuth();
  }

  Future<void> _initializeAuth() async {
    debugPrint('[AUTH_PROVIDER] _initializeAuth started');
    try {
      _token = await TokenStorage.getToken();
      debugPrint('[AUTH_PROVIDER] _token loaded: ${_token != null ? "EXISTS (${_token!.length} chars)" : "NULL"}');
      final userJson = await TokenStorage.getUserJson();
      debugPrint('[AUTH_PROVIDER] userJson loaded: ${userJson != null ? "EXISTS" : "NULL"}');

      if (_token != null && userJson != null) {
        _user = UserModel.fromJson(jsonDecode(userJson) as Map<String, dynamic>);
        debugPrint('[AUTH_PROVIDER] UserModel parsed: ${_user?.fullName} (${_user?.role})');
      }
    } catch (e, stack) {
      debugPrint('[AUTH_PROVIDER] Exception in _initializeAuth: $e\n$stack');
      await TokenStorage.clear();
      _token = null;
      _user = null;
    } finally {
      _isInitializing = false;
      debugPrint('[AUTH_PROVIDER] _isInitializing set to false, calling notifyListeners()');
      notifyListeners();
    }
  }

  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await _authService.login(email, password);
      _token = res.token;
      _user = res.user;
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    await _authService.logout();
    _token = null;
    _user = null;
    _errorMessage = null;
    notifyListeners();
  }
}
