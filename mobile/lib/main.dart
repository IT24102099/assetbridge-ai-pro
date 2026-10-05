import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/providers/auth_provider.dart';
import 'features/auth/screens/login_screen.dart';
import 'features/dashboard/screens/dashboard_screen.dart';
import 'shared/widgets/feedback_states.dart';

void main() {
  debugPrint('[STARTUP] 1. main() started');
  WidgetsFlutterBinding.ensureInitialized();
  debugPrint('[STARTUP] 2. WidgetsFlutterBinding initialized');
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) {
          debugPrint('[STARTUP] 3. ChangeNotifierProvider(AuthProvider) created');
          return AuthProvider();
        }),
      ],
      child: const AssetBridgeApp(),
    ),
  );
  debugPrint('[STARTUP] 4. runApp() invoked');
}

class AssetBridgeApp extends StatelessWidget {
  const AssetBridgeApp({super.key});

  @override
  Widget build(BuildContext context) {
    debugPrint('[STARTUP] 5. AssetBridgeApp.build() executing');
    return MaterialApp(
      title: 'AssetBridge AI',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      home: const AuthWrapper(),
    );
  }
}

class AuthWrapper extends StatelessWidget {
  const AuthWrapper({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    debugPrint('[STARTUP] 6. AuthWrapper.build(): isInitializing=${auth.isInitializing}, isAuthenticated=${auth.isAuthenticated}');

    if (auth.isInitializing) {
      debugPrint('[STARTUP] 7. Rendering LoadingState scaffold');
      return const Scaffold(
        body: LoadingState(message: 'Initializing AssetBridge AI session...'),
      );
    }

    if (auth.isAuthenticated) {
      debugPrint('[STARTUP] 8. Rendering DashboardScreen');
      return const DashboardScreen();
    }

    debugPrint('[STARTUP] 8. Rendering LoginScreen');
    return const LoginScreen();
  }
}
