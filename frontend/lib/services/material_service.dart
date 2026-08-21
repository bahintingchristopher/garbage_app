import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import 'auth_service.dart';
import 'order_service.dart';

class MaterialService {
  final _auth = AuthService();

  /// Returns [{id, name, pricePerKg, description}]
  Future<List<dynamic>> listActive() async {
    try {
      final token = await _auth.getToken();
      final res = await http
          .get(
            Uri.parse('${ApiConfig.baseUrl}/materials'),
            headers: {'Authorization': 'Bearer $token'},
          )
          .timeout(const Duration(seconds: 10));
      final json = jsonDecode(res.body);
      if (res.statusCode == 200) return json['data'];
      throw ApiException(json['message'] ?? 'Failed to load materials');
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Cannot reach server.');
    }
  }
}

