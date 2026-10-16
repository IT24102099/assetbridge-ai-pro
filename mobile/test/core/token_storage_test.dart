import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:assetbridge_mobile/core/storage/token_storage.dart';

void main() {
  group('TokenStorage In-Memory Storage Tests', () {
    setUp(() {
      SharedPreferences.setMockInitialValues({});
    });

    test('saveToken and getToken persists and retrieves token string', () async {
      expect(await TokenStorage.getToken(), isNull);

      await TokenStorage.saveToken('jwt-token-alpha-123');
      expect(await TokenStorage.getToken(), 'jwt-token-alpha-123');
    });

    test('saveUserJson and getUserJson persists and retrieves serialized user profile', () async {
      expect(await TokenStorage.getUserJson(), isNull);

      final userMap = {
        'id': 'usr-001',
        'email': 'owner@assetbridge.lk',
        'role': 'Owner',
      };
      await TokenStorage.saveUserJson(jsonEncode(userMap));

      final retrieved = await TokenStorage.getUserJson();
      expect(retrieved, isNotNull);
      final decoded = jsonDecode(retrieved!) as Map<String, dynamic>;
      expect(decoded['id'], 'usr-001');
      expect(decoded['email'], 'owner@assetbridge.lk');
    });

    test('clear removes both token and userJson from memory storage', () async {
      await TokenStorage.saveToken('jwt-token-to-delete');
      await TokenStorage.saveUserJson('{"name":"Test User"}');

      expect(await TokenStorage.getToken(), isNotNull);
      expect(await TokenStorage.getUserJson(), isNotNull);

      await TokenStorage.clear();

      expect(await TokenStorage.getToken(), isNull);
      expect(await TokenStorage.getUserJson(), isNull);
    });
  });
}
