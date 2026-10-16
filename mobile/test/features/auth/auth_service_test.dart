import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:assetbridge_mobile/core/networking/api_client.dart';
import 'package:assetbridge_mobile/core/storage/token_storage.dart';
import 'package:assetbridge_mobile/features/auth/services/auth_service.dart';
import '../../helpers/test_helpers.dart';

void main() {
  group('AuthService Unit Tests', () {
    late AuthService authService;

    setUp(() async {
      await TestHelpers.setupMockStorage(token: null, user: null);
      authService = AuthService();
    });

    tearDown(() {
      ApiClient.clientOverride = null;
    });

    test('login succeeds and persists token and user JSON to storage', () async {
      final loginData = {
        'token': 'jwt-super-secret-token',
        'user': {
          'id': 'usr-001',
          'email': 'owner@assetbridge.lk',
          'fullName': 'Property Owner',
          'role': 'Owner',
          'isActive': true,
        },
      };

      TestHelpers.setupMockClient((request) async {
        expect(request.url.path, contains('/auth/login'));
        final body = jsonDecode(request.body);
        expect(body['email'], 'owner@assetbridge.lk');
        expect(body['password'], 'ValidPass123!');

        return http.Response(
          TestHelpers.jsonSuccess(loginData),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final response = await authService.login('owner@assetbridge.lk', 'ValidPass123!');

      expect(response.token, 'jwt-super-secret-token');
      expect(response.user.email, 'owner@assetbridge.lk');
      expect(response.user.isOwner, true);

      // Verify stored tokens in memory
      expect(await TokenStorage.getToken(), 'jwt-super-secret-token');
      final storedUser = await TokenStorage.getUserJson();
      expect(storedUser, contains('owner@assetbridge.lk'));
    });

    test('login throws descriptive exception on invalid credentials', () async {
      TestHelpers.setupMockClient((request) async {
        return http.Response(
          TestHelpers.jsonError('Invalid email or password.'),
          401,
          headers: {'content-type': 'application/json'},
        );
      });

      await expectLater(
        () => authService.login('wrong@assetbridge.lk', 'WrongPass!'),
        throwsA(isA<Exception>()),
      );

      // Verify no token was saved
      expect(await TokenStorage.getToken(), isNull);
    });

    test('getMe retrieves authenticated user profile and refreshes storage', () async {
      final userJson = {
        'id': 'usr-002',
        'email': 'kasun.manager@assetbridge.lk',
        'fullName': 'Kasun Manager',
        'role': 'Manager',
        'isActive': true,
      };

      TestHelpers.setupMockClient((request) async {
        expect(request.url.path, contains('/auth/me'));
        return http.Response(
          TestHelpers.jsonSuccess(userJson),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final user = await authService.getMe();
      expect(user.id, 'usr-002');
      expect(user.isManagerOrAdmin, true);

      final storedJson = await TokenStorage.getUserJson();
      expect(storedJson, contains('Kasun Manager'));
    });

    test('logout clears in-memory tokens and user session', () async {
      await TokenStorage.saveToken('token-to-clear');
      await TokenStorage.saveUserJson('{"id":"usr-001"}');

      await authService.logout();

      expect(await TokenStorage.getToken(), isNull);
      expect(await TokenStorage.getUserJson(), isNull);
    });
  });
}
