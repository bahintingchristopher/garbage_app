import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import 'auth_service.dart';

class ApiException implements Exception {
  final String message;
  ApiException(this.message);
  @override
  String toString() => message;
}

class ApiClient {
  ApiClient._();
  static final instance = ApiClient._();

  final _auth = AuthService();

  Future<Map<String, String>> _headers() async {
    final token = await _auth.getToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
    };
  }

  Uri _uri(String path) => Uri.parse('${ApiConfig.baseUrl}$path');

  Future<dynamic> get(String path) async {
    try {
      final res = await http
          .get(_uri(path), headers: await _headers())
          .timeout(const Duration(seconds: 10));
      final json = jsonDecode(res.body);
      if (res.statusCode == 200) return json['data'];
      throw ApiException(json['message'] ?? 'Request failed');
    } on TimeoutException {
      throw ApiException('Server timed out.');
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Cannot reach server.');
    }
  }

  Future<dynamic> post(String path, [Map<String, dynamic>? body]) async {
    try {
      final res = await http
          .post(
            _uri(path),
            headers: await _headers(),
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(const Duration(seconds: 10));
      final json = jsonDecode(res.body);
      if (res.statusCode >= 200 && res.statusCode < 300) return json['data'];
      throw ApiException(json['message'] ?? 'Request failed');
    } on TimeoutException {
      throw ApiException('Server timed out.');
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Cannot reach server.');
    }
  }

  Future<dynamic> put(String path, [Map<String, dynamic>? body]) async {
    try {
      final res = await http
          .put(
            _uri(path),
            headers: await _headers(),
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(const Duration(seconds: 10));
      final json = jsonDecode(res.body);
      if (res.statusCode >= 200 && res.statusCode < 300) return json['data'];
      throw ApiException(json['message'] ?? 'Request failed');
    } on TimeoutException {
      throw ApiException('Server timed out.');
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Cannot reach server.');
    }
  }

  Future<dynamic> delete(String path) async {
    try {
      final res = await http
          .delete(_uri(path), headers: await _headers())
          .timeout(const Duration(seconds: 10));
      if (res.statusCode >= 200 && res.statusCode < 300) {
        if (res.body.isEmpty) return null;
        final json = jsonDecode(res.body);
        return json['data'];
      }
      final json = jsonDecode(res.body);
      throw ApiException(json['message'] ?? 'Request failed');
    } on TimeoutException {
      throw ApiException('Server timed out.');
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Cannot reach server.');
    }
  }

  Future<dynamic> sendMultipart(
    String path,
    String filePath, {
    String fileField = 'photo',
    Map<String, String>? fields,
  }) async {
    try {
      final req = http.MultipartRequest('POST', _uri(path));
      req.headers.addAll(await _headers());
      req.files.add(await http.MultipartFile.fromPath(fileField, filePath));
      fields?.forEach((k, v) => req.fields[k] = v);
      final streamed = await req.send().timeout(const Duration(seconds: 30));
      final json = jsonDecode(await streamed.stream.bytesToString());
      if (streamed.statusCode >= 200 && streamed.statusCode < 300) {
        return json['data'];
      }
      throw ApiException(json['message'] ?? 'Upload failed');
    } on TimeoutException {
      throw ApiException('Server timed out.');
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Cannot reach server.');
    }
  }

  /// Fetches the live system fee from the backend and updates ApiConfig.
  Future<void> fetchSystemFee() async {
    try {
      final data = await get('/settings/system-fee');
      if (data != null && data['systemFeePercent'] != null) {
        ApiConfig.systemFeePercent = (data['systemFeePercent'] as num).toInt();
      }
    } catch (_) {
      // Keep the default value if the API call fails
    }
  }
}