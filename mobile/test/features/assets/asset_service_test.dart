import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:assetbridge_mobile/core/networking/api_client.dart';
import 'package:assetbridge_mobile/features/assets/services/asset_service.dart';
import '../../helpers/test_helpers.dart';

void main() {
  group('AssetService Unit Tests', () {
    late AssetService assetService;

    setUp(() async {
      await TestHelpers.setupMockStorage();
      assetService = AssetService();
    });

    tearDown(() {
      ApiClient.clientOverride = null;
    });

    test('getAssets sends pagination, search and city query parameters', () async {
      Uri? capturedUri;

      TestHelpers.setupMockClient((request) async {
        capturedUri = request.url;
        final paged = TestHelpers.pagedData([TestHelpers.mockAssetJson], totalCount: 1);
        return http.Response(
          TestHelpers.jsonSuccess(paged),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final result = await assetService.getAssets(page: 2, pageSize: 10, searchQuery: 'Havelock', city: 'Colombo');

      expect(capturedUri?.queryParameters['pageNumber'], '2');
      expect(capturedUri?.queryParameters['pageSize'], '10');
      expect(capturedUri?.queryParameters['search'], 'Havelock');
      expect(capturedUri?.queryParameters['city'], 'Colombo');

      expect(result.items.length, 1);
      expect(result.items.first.name, 'Havelock Luxury Residencies');
      expect(result.totalCount, 1);
    });

    test('getAssetById returns parsed AssetModel on success', () async {
      TestHelpers.setupMockClient((request) async {
        expect(request.url.path, contains('/assets/ast-001'));
        return http.Response(
          TestHelpers.jsonSuccess(TestHelpers.mockAssetJson),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final asset = await assetService.getAssetById('ast-001');

      expect(asset.id, 'ast-001');
      expect(asset.name, 'Havelock Luxury Residencies');
      expect(asset.city, 'Colombo');
      expect(asset.country, 'Sri Lanka');
    });

    test('getAssetById throws descriptive exception on API failure', () async {
      TestHelpers.setupMockClient((request) async {
        return http.Response(
          TestHelpers.jsonError('Property record not found'),
          404,
          headers: {'content-type': 'application/json'},
        );
      });

      await expectLater(
        () => assetService.getAssetById('ast-missing'),
        throwsA(isA<Exception>()),
      );
    });
  });
}
