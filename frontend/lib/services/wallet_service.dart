import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import 'auth_service.dart';
import 'order_service.dart';

class WalletService {
  final _auth = AuthService();

  Future<dynamic> _get(String path) async {
    try {
      final token = await _auth.getToken();
      final res = await http
          .get(
            Uri.parse('${ApiConfig.baseUrl}$path'),
            headers: {'Authorization': 'Bearer $token'},
          )
          .timeout(const Duration(seconds: 10));
      final json = jsonDecode(res.body);
      if (res.statusCode == 200) return json['data'];
      throw ApiException(json['message'] ?? 'Request failed');
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Cannot reach server.');
    }
  }

  Future<dynamic> _post(String path, Map<String, dynamic> body) async {
    try {
      final token = await _auth.getToken();
      final res = await http
          .post(
            Uri.parse('${ApiConfig.baseUrl}$path'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $token',
            },
            body: jsonEncode(body),
          )
          .timeout(const Duration(seconds: 10));
      final json = jsonDecode(res.body);
      if (res.statusCode == 201 || res.statusCode == 200) return json['data'];
      throw ApiException(json['message'] ?? 'Request failed');
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Cannot reach server.');
    }
  }

  Future<num> balance() async {
    final data = await _get('/wallet/balance');
    return data['balance'];
  }

  Future<List<dynamic>> history() async =>
      await _get('/wallet/history') as List<dynamic>;

  Future<List<dynamic>> myTopUps() async =>
      await _get('/topups/my') as List<dynamic>;

  Future<Map<String, dynamic>> requestTopUp({
    required num amount,
    required String paymentMethod,
    required String referenceNumber,
  }) async {
    final data = await _post('/topups', {
      'amount': amount,
      'paymentMethod': paymentMethod,
      'referenceNumber': referenceNumber,
    });
    return Map<String, dynamic>.from(data);
  }
}
