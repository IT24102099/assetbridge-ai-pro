class AppConfig {
  static const String appName = 'AssetBridge AI';
  static const String appTagline = 'Your Assets. Always Closer.';

  // Default to Android Emulator loopback. Can be overridden for physical devices.
  static String baseUrl = 'http://10.0.2.2:5206/api';

  static void setBaseUrl(String url) {
    baseUrl = url;
  }

  static bool isProduction = false;
}
