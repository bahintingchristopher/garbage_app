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

class OrderService {
  final _auth = AuthService();

  Future<Map<String, String>> _headers() async {
    final token = await _auth.getToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
    };
  }

  Future<dynamic> _get(String path) async {
    try {
      final res = await http
          .get(Uri.parse('${ApiConfig.baseUrl}$path'), headers: await _headers())
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

  Future<dynamic> _send(String method, String path, Map<String, dynamic>? body) async {
    try {
      final uri = Uri.parse('${ApiConfig.baseUrl}$path');
      final request = http.Request(method, uri)..headers.addAll(await _headers());
      if (body != null) request.body = jsonEncode(body);
      final res = await request.send().timeout(const Duration(seconds: 15));
      final json = jsonDecode(await res.stream.bytesToString());
      if (res.statusCode >= 200 && res.statusCode < 300) return json;
      throw ApiException(json['message'] ?? 'Request failed');
    } on TimeoutException {
      throw ApiException('Server timed out.');
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Cannot reach server.');
    }
  }

  // ---- Client ----
  Future<Map<String, dynamic>> book({
    required String pickupAddress,
    required String scheduledDate,
    required String timeSlot,
    String? notes,
    double? latitude,
    double? longitude,
    List<Map<String, dynamic>>? items,
  }) async {
    final json = await _send('POST', '/orders', {
      'pickupAddress': pickupAddress,
      'scheduledDate': scheduledDate,
      'timeSlot': timeSlot,
      if (notes != null && notes.trim().isNotEmpty) 'notes': notes.trim(),
      'latitude': ?latitude,
      'longitude': ?longitude,
      if (items != null && items.isNotEmpty) 'items': items,
    });
    return json['data'];
  }

  Future<void> cancel(Object orderId) async {
    await _send('POST', '/orders/$orderId/cancel', null);
  }

  /// Collector submits per-material weights -> creates the transaction.
  Future<Map<String, dynamic>> submitWeights(
      Object orderId, List<Map<String, dynamic>> items) async {
    final json = await _send('POST', '/orders/$orderId/weights', {'items': items});
    return json['data'];
  }

  // ---- Collector ----
  Future<List<dynamic>> availableOrders() async => await _get('/orders/available') as List<dynamic>;

  Future<void> claim(Object orderId) async {
    await _send('POST', '/orders/$orderId/request', null);
  }

  Future<void> advanceStatus(Object orderId, String status) async {
    await _send('PATCH', '/orders/$orderId/status', {'status': status});
  }

  // ---- Both roles: own orders ----
  /// Map pins: open pickups + my jobs that have coordinates.
  Future<List<dynamic>> activeLocations() async =>
      await _get('/orders/active-locations') as List<dynamic>;

  Future<List<dynamic>> myOrders() async =>
      await _get('/orders/my') as List<dynamic>;
}










