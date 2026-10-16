import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:assetbridge_mobile/shared/widgets/app_button.dart';
import 'package:assetbridge_mobile/shared/widgets/app_text_field.dart';
import 'package:assetbridge_mobile/shared/widgets/evidence_capture_widget.dart';
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

    testWidgets('AppButton shows progress indicator when isLoading is true',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AppButton(
              text: 'Saving Record',
              isLoading: true,
              onPressed: () {},
            ),
          ),
        ),
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('StatusBadge formats status text properly', (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: Column(
              children: [
                StatusBadge(status: 'AwaitingApproval'),
                StatusBadge(status: 'Verified'),
                StatusBadge(status: 'Pending Review'),
                StatusBadge(status: 'Rejected'),
              ],
            ),
          ),
        ),
      );

      expect(find.text('AwaitingApproval'), findsOneWidget);
      expect(find.text('Verified'), findsOneWidget);
      expect(find.text('Pending Review'), findsOneWidget);
      expect(find.text('Rejected'), findsOneWidget);
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

    testWidgets('AppTextField validates input and displays error',
        (WidgetTester tester) async {
      final formKey = GlobalKey<FormState>();
      final controller = TextEditingController();

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Form(
              key: formKey,
              child: AppTextField(
                label: 'National Identity Number (NIC)',
                hint: 'e.g. 198512345678',
                controller: controller,
                validator: (val) {
                  if (val == null || val.trim().isEmpty) {
                    return 'NIC is required';
                  }
                  return null;
                },
              ),
            ),
          ),
        ),
      );

      expect(find.text('National Identity Number (NIC)'), findsOneWidget);
      expect(find.text('e.g. 198512345678'), findsOneWidget);

      // Trigger validation
      formKey.currentState!.validate();
      await tester.pump();

      expect(find.text('NIC is required'), findsOneWidget);
    });

    testWidgets('EvidenceCaptureWidget renders title, counter, and opens source modal',
        (WidgetTester tester) async {
      List<File> files = [];

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: EvidenceCaptureWidget(
              initialFiles: files,
              maxFiles: 3,
              title: 'NIC Image Verification',
              subtitle: 'Take camera photo or choose from gallery',
              onFilesChanged: (newFiles) => files = newFiles,
            ),
          ),
        ),
      );

      expect(find.text('NIC Image Verification'), findsOneWidget);
      expect(find.text('Take camera photo or choose from gallery'), findsOneWidget);
      expect(find.text('0/3'), findsOneWidget);
      expect(find.text('+ Add Photo'), findsOneWidget);

      // Tap + Add Photo to open bottom sheet
      await tester.tap(find.text('+ Add Photo'));
      await tester.pumpAndSettle();

      expect(find.text('Take Photo'), findsOneWidget);
      expect(find.text('Choose from Gallery'), findsOneWidget);
    });

    testWidgets('Property Assistant proposal governance banner renders actions properly',
        (WidgetTester tester) async {
      bool acceptTapped = false;
      bool rejectTapped = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Container(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  const Text('AI Maintenance Proposal'),
                  const Text('LKR 58,500.00'),
                  Row(
                    children: [
                      Expanded(
                        child: AppButton(
                          text: 'Accept Proposal',
                          onPressed: () => acceptTapped = true,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: AppButton(
                          text: 'Reject / Revise',
                          onPressed: () => rejectTapped = true,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      );

      expect(find.text('AI Maintenance Proposal'), findsOneWidget);
      expect(find.text('LKR 58,500.00'), findsOneWidget);
      expect(find.text('Accept Proposal'), findsOneWidget);
      expect(find.text('Reject / Revise'), findsOneWidget);

      await tester.tap(find.text('Accept Proposal'));
      expect(acceptTapped, true);

      await tester.tap(find.text('Reject / Revise'));
      expect(rejectTapped, true);
    });
  });
}
