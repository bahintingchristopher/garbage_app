import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import 'auth_service.dart';

class UserService {
  final AuthService _authService = AuthService();

  /// Fetches the logged-in user's full profile from GET /api/users/me.
  /// Returns null when there is no session or the request fails.
  Future<Map<String, dynamic>?> getProfile() async {
    final token = await _authService.getToken();
    if (token == null) return null;

    try {
      final response = await http
          .get(
            Uri.parse('${ApiConfig.baseUrl}/users/me'),
            headers: {'Authorization': 'Bearer $token'},
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final json = jsonDecode(response.body) as Map<String, dynamic>;
        return json['data'] as Map<String, dynamic>?;
      }
      return null;
    } on TimeoutException {
      return null;
    } catch (_) {
      return null;
    }
  }
}
