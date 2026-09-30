class AppConfig {
  static const String appName = 'AssetBridge AI';
  static const String appTagline = 'Your Assets. Always Closer.';

  // Production ASP.NET Core API on Render
  static String baseUrl = 'https://assetbridge-api-3v3z.onrender.com/api';

  static void setBaseUrl(String url) {
    baseUrl = url;
  }

  static bool isProduction = true;
}
