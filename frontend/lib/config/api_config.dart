class ApiConfig {
  /// Base URL is injected at launch time via --dart-define=API_BASE_URL=...
  /// Use frontend\run-dev.ps1 to auto-detect the PC's current Wi-Fi IP and
  /// launch the app with the correct value. The default below is only a
  /// fallback for a bare `flutter run` on this machine.
  ///
  /// Android emulator fallback: http://10.0.2.2:5000/api
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:5000/api',
  );

  /// Server origin for uploaded files (photoUrl values start with /uploads/).
  static String get fileBase => baseUrl.replaceFirst(RegExp(r'/api/?$'), '');

  /// System fee (% of a transaction's gross amount), charged to the
  /// collector's eCoin balance on completion. Keep in sync with the
  /// SYSTEM_FEE_PERCENT value configured in the backend .env.
  static const int systemFeePercent = 20;
}

