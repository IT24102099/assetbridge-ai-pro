import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:assetbridge_mobile/shared/widgets/app_button.dart';
import 'package:assetbridge_mobile/shared/widgets/status_badge.dart';
import 'package:assetbridge_mobile/shared/widgets/stat_card.dart';

void main() {
  group('AssetBridge AI Mobile Widget Tests', () {
    testWidgets('AppButton renders text and responds to tap', (WidgetTester tester) async {
      bool tapped = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AppButton(
              text: 'Submit Incident',
              onPressed: () => tapped = true,
            ),
          ),
        ),
      );

      expect(find.text('Submit Incident'), findsOneWidget);
      await tester.tap(find.byType(AppButton));
      expect(tapped, true);
    });

    testWidgets('StatusBadge formats status text properly', (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: StatusBadge(status: 'AwaitingApproval'),
          ),
        ),
      );

      expect(find.text('AwaitingApproval'), findsOneWidget);
    });

    testWidgets('StatCard displays title and value', (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: StatCard(
              title: 'Active Workflows',
              value: '4',
              icon: Icons.account_tree,
            ),
          ),
        ),
      );

      expect(find.text('Active Workflows'), findsOneWidget);
      expect(find.text('4'), findsOneWidget);
    });
  });
}
