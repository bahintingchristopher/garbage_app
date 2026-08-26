import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:socket_io_client/socket_io_client.dart' as io;

import '../config/api_config.dart';
import 'auth_service.dart';
import 'order_service.dart';

class ChatService {
  static final ChatService _instance = ChatService._internal();
  factory ChatService() => _instance;
  ChatService._internal();

  final _auth = AuthService();
  io.Socket? _socket;
  bool _connecting = false;

  /// Broadcast stream of every incoming message (app-wide, single socket).
  final _incoming = StreamController<Map<String, dynamic>>.broadcast();
  Stream<Map<String, dynamic>> get incoming => _incoming.stream;

  /// Broadcast stream of collector location updates.
  final _collectorLocations = StreamController<Map<String, dynamic>>.broadcast();
  Stream<Map<String, dynamic>> get collectorLocationUpdates => _collectorLocations.stream;

  /// Broadcast stream of client location updates.
  final _clientLocations = StreamController<Map<String, dynamic>>.broadcast();
  Stream<Map<String, dynamic>> get clientLocationUpdates => _clientLocations.stream;

  /// The conversation currently open on screen (so global listeners can
  /// suppress banners for it). Set by ChatDetailScreen.
  Object? activeConversationId;

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

  /// Returns the conversation id with this user (creates it if needed).
  Future<Object> startConversation(Object recipientId) async {
    final data =
        await _post('/conversations', {'recipientId': '$recipientId'});
    return data['conversationId'];
  }

  Future<List<dynamic>> conversations() async =>
      await _get('/conversations') as List<dynamic>;

  Future<List<dynamic>> messages(Object conversationId) async =>
      await _get('/conversations/$conversationId/messages') as List<dynamic>;

  Future<Map<String, dynamic>> send(Object conversationId, String text) async {
    final data = await _post('/conversations/$conversationId/messages',
        {'message': text});
    return Map<String, dynamic>.from(data);
  }

  // ---- Real-time ----

  void ensureConnected() {
    if (_socket != null || _connecting) return;
    _connecting = true;
    _auth.getToken().then((token) {
      if (token == null || _socket != null) {
        _connecting = false;
        return;
      }
      final socket = io.io(
        ApiConfig.fileBase,
        io.OptionBuilder()
            .setTransports(['websocket'])
            .setAuth({'token': token})
            .build(),
      );
      _socket = socket;
      socket.onConnect((_) {
        _connecting = false;
      });
      socket.onConnectError((_) {
        _connecting = false;
        _socket = null;
      });
      socket.onDisconnect((_) {
        _connecting = false;
        _socket = null;
      });
      socket.on('new_message', (data) {
        if (data is Map) {
          _incoming.add(Map<String, dynamic>.from(data));
        }
      });
      socket.on('collector_location_update', (data) {
        if (data is Map) {
          _collectorLocations.add(Map<String, dynamic>.from(data));
        }
      });
      socket.on('client_location_update', (data) {
        if (data is Map) {
          _clientLocations.add(Map<String, dynamic>.from(data));
        }
      });
    }).catchError((_) {
      _connecting = false;
    });
  }

  /// Compatibility: kept so existing call sites keep working.
  void connect() => ensureConnected();

  StreamSubscription<Map<String, dynamic>> onMessage(
          void Function(Map<String, dynamic>) handler) =>
      incoming.listen(handler);

  void disposeSocket() {
    _socket?.dispose();
    _socket = null;
  }
}
