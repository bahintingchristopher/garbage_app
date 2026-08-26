import 'dart:convert';

import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import 'auth_service.dart';
import 'order_service.dart';

class LocationService {
  final _auth = AuthService();

  /// [{collectorId, name, latitude, longitude, updatedAt}]
  Future<List<dynamic>> allCollectors() async {
    try {
      final token = await _auth.getToken();
      final res = await http
          .get(
            Uri.parse('${ApiConfig.baseUrl}/collectors/locations'),
            headers: {'Authorization': 'Bearer $token'},
          )
          .timeout(const Duration(seconds: 10));
      final json = jsonDecode(res.body);
      if (res.statusCode == 200) return json['data'];
      throw ApiException(json['message'] ?? 'Failed to load locations');
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Cannot reach server.');
    }
  }

  /// Collector pushes fresh GPS coordinates.
  Future<void> push(double latitude, double longitude) async {
    final token = await _auth.getToken();
    final res = await http
        .patch(
          Uri.parse('${ApiConfig.baseUrl}/collectors/location'),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer $token',
          },
          body: jsonEncode({'latitude': latitude, 'longitude': longitude}),
        )
        .timeout(const Duration(seconds: 10));
    if (res.statusCode != 200) {
      final json = jsonDecode(res.body);
      throw ApiException(json['message'] ?? 'Failed to update location');
    }
  }

  /// Client pushes fresh GPS coordinates.
  Future<void> pushClientLocation(double latitude, double longitude) async {
    final token = await _auth.getToken();
    final res = await http
        .patch(
          Uri.parse('${ApiConfig.baseUrl}/collectors/client-location'),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer $token',
          },
          body: jsonEncode({'latitude': latitude, 'longitude': longitude}),
        )
        .timeout(const Duration(seconds: 10));
    if (res.statusCode != 200) {
      final json = jsonDecode(res.body);
      throw ApiException(json['message'] ?? 'Failed to update client location');
    }
  }

  /// Live client locations for a collector's active orders.
  Future<List<dynamic>> clientLocations() async {
    try {
      final token = await _auth.getToken();
      final res = await http
          .get(
            Uri.parse('${ApiConfig.baseUrl}/collectors/client-locations'),
            headers: {'Authorization': 'Bearer $token'},
          )
          .timeout(const Duration(seconds: 10));
      final json = jsonDecode(res.body);
      if (res.statusCode == 200) return json['data'];
      throw ApiException(json['message'] ?? 'Failed to load client locations');
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Cannot reach server.');
    }
  }

  /// Returns the device's current position, or null if GPS off/denied.
  Future<Position?> getCurrent() async {
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return null;

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      return null;
    }
    return Geolocator.getCurrentPosition();
  }
}
