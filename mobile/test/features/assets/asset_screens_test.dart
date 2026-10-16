import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:assetbridge_mobile/core/networking/api_client.dart';
import 'package:assetbridge_mobile/features/assets/screens/asset_detail_screen.dart';
import 'package:assetbridge_mobile/features/assets/screens/asset_list_screen.dart';
import '../../helpers/test_helpers.dart';

void main() {
  group('Asset Screens Widget Tests', () {
    setUp(() async {
      await TestHelpers.setupMockStorage();
    });

    tearDown(() {
      ApiClient.clientOverride = null;
    });

    testWidgets('AssetListScreen renders loading state initially, then empty state when no items', (tester) async {
      TestHelpers.setupMockClient((request) async {
        final paged = TestHelpers.pagedData([], totalCount: 0);
        return http.Response(
          TestHelpers.jsonSuccess(paged),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      await tester.pumpWidget(const MaterialApp(home: AssetListScreen()));

      // Initially loading
      expect(find.text('Loading property assets...'), findsOneWidget);

      await tester.pumpAndSettle();

      // Empty state rendered
      expect(find.text('No Properties Found'), findsOneWidget);
      expect(find.text('No property assets match your search criteria.'), findsOneWidget);
    });

    testWidgets('AssetListScreen renders populated asset card and search input', (tester) async {
      TestHelpers.setupMockClient((request) async {
        final paged = TestHelpers.pagedData([TestHelpers.mockAssetJson], totalCount: 1);
        return http.Response(
          TestHelpers.jsonSuccess(paged),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      await tester.pumpWidget(const MaterialApp(home: AssetListScreen()));
      await tester.pumpAndSettle();

      expect(find.text('Havelock Luxury Residencies'), findsOneWidget);
      expect(find.text('Colombo, Western'), findsOneWidget);
      expect(find.byType(TextField), findsOneWidget);
    });

    testWidgets('AssetDetailScreen renders property overview and details', (tester) async {
      TestHelpers.setupMockClient((request) async {
        return http.Response(
          TestHelpers.jsonSuccess(TestHelpers.mockAssetJson),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      await tester.pumpWidget(const MaterialApp(
        home: AssetDetailScreen(assetId: 'ast-001'),
      ));

      expect(find.text('Loading asset history & details...'), findsOneWidget);

      await tester.pumpAndSettle();

      expect(find.text('Havelock Luxury Residencies'), findsWidgets);
      expect(find.text('124 Havelock Rd'), findsOneWidget);
      expect(find.text('Colombo, Western 00500'), findsOneWidget);
    });

    testWidgets('AssetDetailScreen renders error state on failure with retry button', (tester) async {
      TestHelpers.setupMockClient((request) async {
        return http.Response(
          TestHelpers.jsonError('Unable to load property details'),
          500,
          headers: {'content-type': 'application/json'},
        );
      });

      await tester.pumpWidget(const MaterialApp(
        home: AssetDetailScreen(assetId: 'ast-001'),
      ));
      await tester.pumpAndSettle();

      expect(find.text('Unable to load property details'), findsOneWidget);
      expect(find.text('Retry'), findsOneWidget);
    });
  });
}
