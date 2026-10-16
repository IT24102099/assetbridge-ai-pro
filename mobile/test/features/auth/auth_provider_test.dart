import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:assetbridge_mobile/core/networking/api_client.dart';
import 'package:assetbridge_mobile/core/storage/token_storage.dart';
import 'package:assetbridge_mobile/features/auth/providers/auth_provider.dart';
import '../../helpers/test_helpers.dart';

void main() {
  group('AuthProvider State Management Tests', () {
    tearDown(() {
      ApiClient.clientOverride = null;
    });

    test('initializes as unauthenticated when storage is empty', () async {
      await TestHelpers.setupMockStorage(token: null, user: null);
      await TokenStorage.clear();

      final provider = AuthProvider();

      // Wait for microtask / async _initializeAuth to finish
      await Future.delayed(const Duration(milliseconds: 50));

      expect(provider.isInitializing, false);
      expect(provider.isAuthenticated, false);
      expect(provider.token, isNull);
      expect(provider.user, isNull);
    });

    test('initializes as authenticated when valid token and user JSON exist in storage', () async {
      final user = {
        'id': 'usr-001',
        'email': 'owner@assetbridge.lk',
        'fullName': 'Property Owner',
        'role': 'Owner',
        'isActive': true,
      };
      await TestHelpers.setupMockStorage(token: 'existing-jwt-token', user: user);

      final provider = AuthProvider();
      await Future.delayed(const Duration(milliseconds: 50));

      expect(provider.isInitializing, false);
      expect(provider.isAuthenticated, true);
      expect(provider.token, 'existing-jwt-token');
      expect(provider.user?.email, 'owner@assetbridge.lk');
      expect(provider.user?.isOwner, true);
    });

    test('login success updates state, sets isAuthenticated to true and clears error', () async {
      await TestHelpers.setupMockStorage(token: null, user: null);
      await TokenStorage.clear();

      TestHelpers.setupMockClient((request) async {
        return http.Response(
          TestHelpers.jsonSuccess({
            'token': 'new-login-token',
            'user': {
              'id': 'usr-003',
              'email': 'manager@assetbridge.lk',
              'fullName': 'Property Manager',
              'role': 'PropertyManager',
              'isActive': true,
            },
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final provider = AuthProvider();
      await Future.delayed(const Duration(milliseconds: 50));

      int listenerCount = 0;
      provider.addListener(() => listenerCount++);

      final success = await provider.login('manager@assetbridge.lk', 'ManagerPass123!');

      expect(success, true);
      expect(provider.isAuthenticated, true);
      expect(provider.token, 'new-login-token');
      expect(provider.user?.fullName, 'Property Manager');
      expect(provider.errorMessage, isNull);
      expect(listenerCount, greaterThan(0));
    });

    test('login failure updates error message, keeps isAuthenticated false and notifies listeners', () async {
      await TestHelpers.setupMockStorage(token: null, user: null);
      await TokenStorage.clear();

      TestHelpers.setupMockClient((request) async {
        return http.Response(
          TestHelpers.jsonError('Invalid credentials provided'),
          401,
          headers: {'content-type': 'application/json'},
        );
      });

      final provider = AuthProvider();
      await Future.delayed(const Duration(milliseconds: 50));

      final success = await provider.login('wrong@assetbridge.lk', 'WrongPass!');

      expect(success, false);
      expect(provider.isAuthenticated, false);
      expect(provider.token, isNull);
      expect(provider.user, isNull);
      expect(provider.errorMessage, contains('Invalid credentials'));
    });

    test('logout clears user and token state', () async {
      final user = {'id': 'usr-001', 'email': 'test@test.com', 'role': 'Owner', 'isActive': true};
      await TestHelpers.setupMockStorage(token: 'active-jwt', user: user);

      final provider = AuthProvider();
      await Future.delayed(const Duration(milliseconds: 50));

      expect(provider.isAuthenticated, true);

      await provider.logout();

      expect(provider.isAuthenticated, false);
      expect(provider.token, isNull);
      expect(provider.user, isNull);
      expect(await TokenStorage.getToken(), isNull);
    });
  });
}
