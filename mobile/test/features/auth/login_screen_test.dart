import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import 'package:assetbridge_mobile/core/networking/api_client.dart';
import 'package:assetbridge_mobile/features/auth/providers/auth_provider.dart';
import 'package:assetbridge_mobile/features/auth/screens/login_screen.dart';
import '../../helpers/test_helpers.dart';

void main() {
  group('LoginScreen Widget Tests', () {
    setUp(() async {
      await TestHelpers.setupMockStorage(token: null, user: null);
    });

    tearDown(() {
      ApiClient.clientOverride = null;
    });

    Widget createTestApp(AuthProvider authProvider) {
      return MultiProvider(
        providers: [
          ChangeNotifierProvider<AuthProvider>.value(value: authProvider),
        ],
        child: const MaterialApp(
          home: LoginScreen(),
        ),
      );
    }

    testWidgets('renders brand title, tagline, form fields and quick demo buttons', (tester) async {
      final auth = AuthProvider();

      await tester.pumpWidget(createTestApp(auth));
      await tester.pump();

      expect(find.text('AssetBridge AI'), findsOneWidget);
      expect(find.text('Your Assets. Always Closer.'), findsOneWidget);
      expect(find.text('Sign In'), findsNWidgets(2)); // Title and Button
      expect(find.text('Email Address'), findsOneWidget);
      expect(find.text('Password'), findsOneWidget);

      // Verify Demo Chips
      expect(find.text('Property Owner'), findsOneWidget);
      expect(find.text('Manager / Admin'), findsOneWidget);
      expect(find.text('Service Provider'), findsOneWidget);
      expect(find.text('Representative'), findsOneWidget);
    });

    testWidgets('triggers validation errors when submitting empty form', (tester) async {
      final auth = AuthProvider();

      await tester.pumpWidget(createTestApp(auth));
      await tester.pump();

      // Clear default demo credentials
      final emailField = find.widgetWithText(TextFormField, 'owner@assetbridge.lk');
      if (emailField.evaluate().isNotEmpty) {
        await tester.enterText(emailField, '');
      }

      // Enter empty in password
      final passField = find.widgetWithText(TextFormField, 'SecurePassword123!');
      if (passField.evaluate().isNotEmpty) {
        await tester.enterText(passField, '');
      }

      // Tap Sign In button
      await tester.tap(find.widgetWithText(ElevatedButton, 'Sign In'));
      await tester.pump();

      expect(find.text('Email is required'), findsOneWidget);
      expect(find.text('Password is required'), findsOneWidget);
    });

    testWidgets('tapping quick demo chip populates email and password fields', (tester) async {
      final auth = AuthProvider();

      await tester.pumpWidget(createTestApp(auth));
      await tester.pump();

      // Ensure demo chip is scrolled into view and tap
      final managerChip = find.text('Manager / Admin');
      await tester.ensureVisible(managerChip);
      await tester.pumpAndSettle();

      await tester.tap(managerChip);
      await tester.pump();

      expect(find.text('manager@assetbridge.lk'), findsOneWidget);
    });

    testWidgets('shows error SnackBar when login fails against mocked API', (tester) async {
      TestHelpers.setupMockClient((request) async {
        return http.Response(
          TestHelpers.jsonError('Invalid email or password combination.'),
          401,
          headers: {'content-type': 'application/json'},
        );
      });

      final auth = AuthProvider();

      await tester.pumpWidget(createTestApp(auth));
      await tester.pump();

      // Tap Sign In
      await tester.tap(find.widgetWithText(ElevatedButton, 'Sign In'));
      await tester.pump(); // Start request
      await tester.pump(const Duration(milliseconds: 100)); // Complete request
      await tester.pumpAndSettle();

      expect(find.text('Invalid email or password combination.'), findsOneWidget);
    });
  });
}
