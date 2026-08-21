import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../config/api_config.dart';

class AuthResult {
  final bool success;
  final String message;
  final Map<String, dynamic>? user;

  AuthResult({required this.success, required this.message, this.user});
}

class AuthService {
  static const _tokenKey = 'jwt_token';
  static const _userKey = 'user_json';

  Future<AuthResult> register({
    required String name,
    required String email,
    required String password,
    required String contactNumber,
    required String address,
    required String role,
  }) async {
    return _post('${ApiConfig.baseUrl}/auth/register', {
      'name': name,
      'email': email,
      'password': password,
      'contactNumber': contactNumber,
      'address': address,
      'role': role,
    });
  }

  Future<AuthResult> login(String email, String password) async {
    return _post('${ApiConfig.baseUrl}/auth/login', {
      'email': email,
      'password': password,
    });
  }

  Future<AuthResult> _post(String url, Map<String, dynamic> body) async {
    try {
      final response = await http
          .post(
            Uri.parse(url),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode(body),
          )
          .timeout(const Duration(seconds: 10));

      final json = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final data = json['data'] as Map<String, dynamic>;
        await _saveSession(data['token'] as String, data['user']);
        return AuthResult(
          success: true,
          message: json['message'] ?? 'Success',
          user: data['user'] as Map<String, dynamic>?,
        );
      }

      return AuthResult(
        success: false,
        message: json['message'] ?? 'Request failed (${response.statusCode})',
      );
    } on TimeoutException {
      return AuthResult(
          success: false, message: 'Server timed out. Is the backend running?');
    } on http.ClientException {
      return AuthResult(
          success: false,
          message: 'Cannot reach server. Check your connection/API URL.');
    } catch (_) {
      return AuthResult(success: false, message: 'Unexpected error.');
    }
  }

  Future<void> _saveSession(String token, dynamic user) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
    if (user != null) {
      await prefs.setString(_userKey, jsonEncode(user));
    }
  }

  Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }

  Future<Map<String, dynamic>?> getSavedUser() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_userKey);
    if (raw == null) return null;
    return jsonDecode(raw) as Map<String, dynamic>;
  }

  Future<bool> hasToken() async => await getToken() != null;

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_userKey);
  }
}

