import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import 'package:assetbridge_mobile/core/networking/api_client.dart';
import 'package:assetbridge_mobile/features/auth/providers/auth_provider.dart';
import 'package:assetbridge_mobile/features/incidents/screens/incident_detail_screen.dart';
import 'package:assetbridge_mobile/features/incidents/screens/incident_list_screen.dart';
import 'package:assetbridge_mobile/features/incidents/screens/report_incident_screen.dart';
import '../../helpers/test_helpers.dart';

void main() {
  group('Incident Screens Widget Tests', () {
    late AuthProvider authProvider;

    setUp(() async {
      await TestHelpers.setupMockStorage();
      authProvider = AuthProvider();
      await Future.delayed(const Duration(milliseconds: 50));
    });

    tearDown(() {
      ApiClient.clientOverride = null;
    });

    Widget wrapWithProviders(Widget child) {
      return MultiProvider(
        providers: [
          ChangeNotifierProvider<AuthProvider>.value(value: authProvider),
        ],
        child: MaterialApp(home: child),
      );
    }

    testWidgets('IncidentListScreen renders empty state when no incidents exist', (tester) async {
      TestHelpers.setupMockClient((request) async {
        final paged = TestHelpers.pagedData([], totalCount: 0);
        return http.Response(
          TestHelpers.jsonSuccess(paged),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      await tester.pumpWidget(wrapWithProviders(const IncidentListScreen()));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('No Incidents Found'), findsOneWidget);
      expect(
        find.text('All properties are running smoothly with no active maintenance tickets.'),
        findsOneWidget,
      );
    });

    testWidgets('IncidentListScreen renders populated incident cards and category tabs', (tester) async {
      TestHelpers.setupMockClient((request) async {
        final paged = TestHelpers.pagedData([TestHelpers.mockIncidentJson], totalCount: 1);
        return http.Response(
          TestHelpers.jsonSuccess(paged),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      await tester.pumpWidget(wrapWithProviders(const IncidentListScreen()));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('Roof Leakage in Master Bedroom'), findsOneWidget);
      expect(find.text('Havelock Luxury Residencies'), findsOneWidget);
      expect(find.text('Planning'), findsWidgets);
    });

    testWidgets('ReportIncidentScreen validates form fields and rejects empty submission', (tester) async {
      TestHelpers.setupMockClient((request) async {
        final pagedAssets = TestHelpers.pagedData([TestHelpers.mockAssetJson], totalCount: 1);
        return http.Response(
          TestHelpers.jsonSuccess(pagedAssets),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      await tester.pumpWidget(wrapWithProviders(const ReportIncidentScreen()));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('Report Property Defect'), findsOneWidget);

      // Scroll to submit button and tap
      final submitBtn = find.widgetWithText(ElevatedButton, 'Submit Incident & Start Workflow');
      await tester.ensureVisible(submitBtn);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 50));

      await tester.tap(submitBtn);
      await tester.pump();

      expect(find.text('Title is required'), findsOneWidget);
      expect(find.text('Description is required'), findsOneWidget);
    });

    testWidgets('IncidentDetailScreen renders lifecycle progress, severity and description', (tester) async {
      TestHelpers.setupMockClient((request) async {
        return http.Response(
          TestHelpers.jsonSuccess(TestHelpers.mockIncidentJson),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      await tester.pumpWidget(wrapWithProviders(const IncidentDetailScreen(incidentId: 'inc-001')));
      expect(find.text('Loading incident data...'), findsOneWidget);

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('Roof Leakage in Master Bedroom'), findsOneWidget);
      expect(find.text('Water dripping during heavy rain.'), findsOneWidget);
      expect(find.text('Roofing'), findsOneWidget);
      expect(find.text('High'), findsOneWidget);
    });
  });
}
