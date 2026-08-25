import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import 'auth_service.dart';
import 'order_service.dart';

class SettingsService {
  final _auth = AuthService();

  Future<Map<String, String>> _headers() async {
    final token = await _auth.getToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
    };
  }

  /// Payment details shown to collectors when they request a top-up.
  Future<Map<String, dynamic>> paymentSettings() async {
    try {
      final res = await http
          .get(Uri.parse('${ApiConfig.baseUrl}/settings/payment'),
              headers: await _headers())
          .timeout(const Duration(seconds: 10));
      final json = jsonDecode(res.body);
      if (res.statusCode == 200) return Map<String, dynamic>.from(json['data']);
      throw ApiException(json['message'] ?? 'Request failed');
    } on TimeoutException {
      throw ApiException('Server timed out.');
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Cannot reach server.');
    }
  }

  /// Admin only: update the payment details reflected in the collector app.
  Future<Map<String, dynamic>> updatePaymentSettings(
      Map<String, dynamic> patch) async {
    try {
      final res = await http
          .put(Uri.parse('${ApiConfig.baseUrl}/settings/payment'),
              headers: await _headers(),
              body: jsonEncode(patch))
          .timeout(const Duration(seconds: 10));
      final json = jsonDecode(res.body);
      if (res.statusCode == 200) return Map<String, dynamic>.from(json['data']);
      throw ApiException(json['message'] ?? 'Request failed');
    } on TimeoutException {
      throw ApiException('Server timed out.');
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Cannot reach server.');
    }
  }
}
