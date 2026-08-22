import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import 'auth_service.dart';
import 'order_service.dart';

class TransactionService {
  final _auth = AuthService();

  Map<String, String> _headers({String? token}) => {
        'Authorization': 'Bearer $token',
      };

  /// Full transaction for an order (items, total, photo, deadline).
  Future<Map<String, dynamic>> getByOrder(Object orderId) async {
    try {
      final token = await _auth.getToken();
      final res = await http
          .get(
            Uri.parse('${ApiConfig.baseUrl}/transactions/order/$orderId'),
            headers: _headers(token: token),
          )
          .timeout(const Duration(seconds: 10));
      final json = jsonDecode(res.body);
      if (res.statusCode == 200) return json['data'];
      throw ApiException(json['message'] ?? 'Failed to load transaction');
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Cannot reach server.');
    }
  }

  /// Collector attaches proof photo (multipart field: 'photo').
  Future<void> uploadPhoto(Object transactionId, String filePath) async {
    final token = await _auth.getToken();
    final req = http.MultipartRequest(
      'POST',
      Uri.parse('${ApiConfig.baseUrl}/transactions/$transactionId/photo'),
    );
    req.headers.addAll(_headers(token: token));
    req.files.add(await http.MultipartFile.fromPath('photo', filePath));
    final streamed = await req.send().timeout(const Duration(seconds: 30));
    final json =
        jsonDecode(await streamed.stream.bytesToString());
    if (streamed.statusCode != 200) {
      throw ApiException(json['message'] ?? 'Photo upload failed');
    }
  }

  /// Client approves the weights -> collector gets paid.
  Future<void> confirm(Object transactionId) async {
    final token = await _auth.getToken();
    final res = await http
        .post(
          Uri.parse('${ApiConfig.baseUrl}/transactions/$transactionId/confirm'),
          headers: _headers(token: token),
        )
        .timeout(const Duration(seconds: 10));
    if (res.statusCode != 200) {
      final json = jsonDecode(res.body);
      throw ApiException(json['message'] ?? 'Confirm failed');
    }
  }
}