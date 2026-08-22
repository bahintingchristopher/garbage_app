class ApiConfig {
  /// Real phone on the same Wi-Fi: use this PC's local IP (from `ipconfig`).
  /// If your router assigns a new IP later, update it here and rebuild.
  /// For the Android emulator, use http://10.0.2.2:5000/api instead.
  static const String baseUrl = 'http://192.168.8.39:5000/api';

  /// Server origin for uploaded files (photoUrl values start with /uploads/).
  static String get fileBase => baseUrl.replaceFirst(RegExp(r'/api/?$'), '');

  /// System fee (% of a transaction's gross amount), charged to the
  /// collector's eCoin balance on completion. Keep in sync with the
  /// SYSTEM_FEE_PERCENT value configured in the backend .env.
  static const int systemFeePercent = 20;
}
