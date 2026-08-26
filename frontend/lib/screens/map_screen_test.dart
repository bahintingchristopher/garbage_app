import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';

import '../services/auth_service.dart';
import '../services/location_service.dart';
import '../widgets/shared_widgets.dart';
import '../services/order_service.dart';
import '../services/chat_service.dart';

class MapScreen extends StatefulWidget {
  const MapScreen({super.key});

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  final _locations = LocationService();
  final _orders = OrderService();
  final _chat = ChatService();
  final _mapController = MapController();

  /// Fallback: Quezon City area.
  static const _defaultCenter = LatLng(14.6407, 121.0018);

  String? _role;
  int? _myId;
  List<dynamic> _collectors = [];
  List<dynamic> _clientOrders = [];
  List<dynamic> _clientLocations = [];
  Position? _myPosition;
  bool _loading = true;
  bool _live = false;
  String? _error;
  String? _notice;
  Timer? _pushTimer;
  Timer? _refreshTimer;
  StreamSubscription<Map<String, dynamic>>? _collectorSub;
  StreamSubscription<Map<String, dynamic>>? _clientSub;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final user = await AuthService().getSavedUser();
      _role = user?['role'];
      _myId = int.tryParse('${user?['id']}');
      _collectors = await _locations.allCollectors();
      if (_role == 'COLLECTOR') {
        try {
          _clientOrders = await _orders.activeLocations();
        } catch (_) {
          _clientOrders = [];
        }
        try {
          _clientLocations = await _locations.clientLocations();
        } catch (_) {
          _clientLocations = [];
        }
      }
      await _startLiveTracking();
      _subscribeToSocket();
    } catch (e) {
      _error = e.toString();
    }
    if (mounted) setState(() => _loading = false);
  }

  /// Both roles push their GPS every 15s while this screen is open.
  Future<void> _startLiveTracking() async {
    final pos = await _locations.getCurrent();
    if (pos == null) {
      setState(() => _notice =
          'Location permission is off - the other party cannot see you on the map.');
      return;
    }
    try {
      if (_role == 'COLLECTOR') {
        await _locations.push(pos.latitude, pos.longitude);
      } else if (_role == 'CLIENT') {
        await _locations.pushClientLocation(pos.latitude, pos.longitude);
      }
      setState(() {
        _myPosition = pos;
        _live = true;
        _notice = null;
      });
      _pushTimer =
          Timer.periodic(const Duration(seconds: 15), (_) => _pushOnce());
      // Also refresh REST data periodically (fallback if socket misses)
      _refreshTimer =
          Timer.periodic(const Duration(seconds: 10), (_) => _refreshData());
    } catch (e) {
      setState(() => _notice = e.toString());
    }
  }

  Future<void> _pushOnce() async {
    try {
      final pos = await _locations.getCurrent();
      if (pos == null) return;
      if (_role == 'COLLECTOR') {
        await _locations.push(pos.latitude, pos.longitude);
      } else if (_role == 'CLIENT') {
        await _locations.pushClientLocation(pos.latitude, pos.longitude);
      }
      if (mounted) setState(() => _myPosition = pos);
    } catch (_) {
      /* keep trying silently */
    }
  }

  Future<void> _refreshData() async {
    try {
      final collectors = await _locations.allCollectors();
      List<dynamic> clientLocs = [];
      if (_role == 'COLLECTOR') {
        clientLocs = await _locations.clientLocations();
      }
      if (mounted) {
        setState(() {
          _collectors = collectors;
          _clientLocations = clientLocs;
        });
      }
    } catch (_) {
      /* non-fatal */
    }
  }

  void _subscribeToSocket() {
    _chat.ensureConnected();

    _collectorSub?.cancel();
    _collectorSub = _chat.collectorLocationUpdates.listen((data) {
      if (!mounted) return;
      final collectorId = data['collectorId'];
      final lat = (data['latitude'] as num?)?.toDouble();
      final lng = (data['longitude'] as num?)?.toDouble();
      if (lat == null || lng == null) return;

      setState(() {
        // Update existing collector in the list
        bool found = false;
        for (var i = 0; i < _collectors.length; i++) {
          if ('${_collectors[i]['collectorId']}' == '$collectorId') {
            _collectors[i] = {
              ...Map<String, dynamic>.from(_collectors[i]),
              'latitude': lat,
              'longitude': lng,
              'updatedAt': data['updatedAt'],
              'name': data['name'] ?? _collectors[i]['name'],
            };
            found = true;
            break;
          }
        }
        if (!found) {
          _collectors.add({
            'collectorId': collectorId,
            'name': data['name'] ?? 'Collector',
            'latitude': lat,
            'longitude': lng,
            'updatedAt': data['updatedAt'],
          });
        }
      });
    });

    _clientSub?.cancel();
    _clientSub = _chat.clientLocationUpdates.listen((data) {
      if (!mounted) return;
      final clientId = data['clientId'];
      final lat = (data['latitude'] as num?)?.toDouble();
      final lng = (data['longitude'] as num?)?.toDouble();
      if (lat == null || lng == null) return;

      setState(() {
        bool found = false;
        for (var i = 0; i < _clientLocations.length; i++) {
          if ('${_clientLocations[i]['clientId']}' == '$clientId') {
            _clientLocations[i] = {
              ...Map<String, dynamic>.from(_clientLocations[i]),
              'latitude': lat,
              'longitude': lng,
              'updatedAt': data['updatedAt'],
              'name': data['name'] ?? _clientLocations[i]['name'],
            };
            found = true;
            break;
          }
        }
        if (!found) {
          _clientLocations.add({
            'clientId': clientId,
            'name': data['name'] ?? 'Client',
            'latitude': lat,
            'longitude': lng,
            'updatedAt': data['updatedAt'],
          });
        }
      });
    });
  }

  LatLng get _center {
    if (_myPosition != null) {
      return LatLng(_myPosition!.latitude, _myPosition!.longitude);
    }
    if (_clientOrders.isNotEmpty) {
      return LatLng(
        (_clientOrders.first['latitude'] as num).toDouble(),
        (_clientOrders.first['longitude'] as num).toDouble(),
      );
    }
    if (_collectors.isNotEmpty) {
      return LatLng(
        (_collectors.first['latitude'] as num).toDouble(),
        (_collectors.first['longitude'] as num).toDouble(),
      );
    }
    return _defaultCenter;
  }

  // ---------- Zoom controls ----------

  void _zoomBy(double delta) {
    final camera = _mapController.camera;
    final newZoom = (camera.zoom + delta).clamp(3.0, 19.0);
    _mapController.move(camera.center, newZoom);
  }

  Widget _zoomButton(IconData icon, VoidCallback onTap) => Material(
        color: Colors.white,
        elevation: 2,
        borderRadius: BorderRadius.circular(10),
        child: InkWell(
          borderRadius: BorderRadius.circular(10),
          onTap: onTap,
          child: SizedBox(
            width: 44,
            height: 44,
            child: Icon(icon, size: 26, color: Colors.grey.shade800),
          ),
        ),
      );


  /// Centers the map on the first tracked client and zooms to a comfortable level.
  void _centerOnClient() {
    LatLng? target;

    // Prefer live client location (real-time push).
    if (_clientLocations.isNotEmpty) {
      target = LatLng(
        (_clientLocations.first['latitude'] as num).toDouble(),
        (_clientLocations.first['longitude'] as num).toDouble(),
      );
    }
    // Fallback: order pickup location.
    if (target == null && _clientOrders.isNotEmpty) {
      target = LatLng(
        (_clientOrders.first['latitude'] as num).toDouble(),
        (_clientOrders.first['longitude'] as num).toDouble(),
      );
    }
    if (target == null) return;
    _mapController.move(target, 16);
  }


  // ---------- Stale marker helpers ----------

  bool _isStale(dynamic updatedAt) {
    if (updatedAt == null) return true;
    try {
      final dt = DateTime.parse('$updatedAt').toLocal();
      return DateTime.now().difference(dt).inSeconds > 60;
    } catch (_) {
      return true;
    }
  }

  Color _staleColor(bool stale, Color normal) =>
      stale ? Colors.grey.shade400 : normal;

  // ---------- Bottom sheets ----------

  void _showClientSheet(Map o) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  CircleAvatar(
                    backgroundColor: Colors.orange.shade100,
                    child: Text(
                      '${o['client']['name']?[0] ?? '?'}',
                      style: TextStyle(
                          color: Colors.orange.shade900,
                          fontWeight: FontWeight.bold),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('${o['client']['name']}',
                            style: const TextStyle(
                                fontSize: 18, fontWeight: FontWeight.bold)),
                        Text('Order #${o['orderId']}',
                            style: TextStyle(
                                color: Colors.grey.shade600, fontSize: 12)),
                      ],
                    ),
                  ),
                  statusChip('${o['status']}'),
                ],
              ),
              const Divider(height: 24),
              _infoRow(Icons.phone_outlined,
                  '${o['client']['contactNumber'] ?? 'No contact number'}'),
              _infoRow(Icons.location_on_outlined, '${o['pickupAddress']}'),
              _infoRow(Icons.event_outlined,
                  '${o['scheduledDate']} - ${o['timeSlot']}'),
              if ((o['items'] as List?)?.isNotEmpty ?? false) ...[
                const SizedBox(height: 8),
                const Text('Expected materials',
                    style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                for (final it in (o['items'] as List))
                  Padding(
                      padding: const EdgeInsets.only(bottom: 2),
                      child: Row(children: [
                        const Icon(Icons.recycling,
                            size: 16, color: Colors.green),
                        const SizedBox(width: 6),
                        Expanded(
                            child: Text(
                                '${it['material'] ?? 'Material'} (P${it['declaredPricePerKg']}/kg)',
                                overflow: TextOverflow.ellipsis)),
                        Text('~${it['estimatedKg']} kg = P${it['subtotal']}',
                            style: TextStyle(color: Colors.grey.shade600))
                      ])),
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Estimated total',
                          style: TextStyle(fontWeight: FontWeight.bold)),
                      Text(
                        'P${(o['items'] as List).fold<double>(0, (s, it) => s + ((it['subtotal'] as num?) ?? 0).toDouble()).toStringAsFixed(2)}',
                        style: const TextStyle(fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () {
                        Navigator.pop(ctx);
                        openChat(context, o['client']['id'], o['client']['name']);
                      },
                      icon: const Icon(Icons.chat_bubble_outline),
                      label: const Text('Chat'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: FilledButton.tonalIcon(
                      onPressed: () => callClient(context, o['client']['contactNumber']),
                      icon: const Icon(Icons.call_outlined),
                      label: const Text('Call'),
                    ),
                  ),
                ],
              ),
              if ('${o['status']}' == 'BOOKED') ...[
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: () async {
                      try {
                        await _orders.claim(o['orderId']);
                        if (!ctx.mounted) return;
                        Navigator.pop(ctx);
                        if (!mounted) return;
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                            content: Text(
                                'You claimed order #${o['orderId']}!')));
                        _load();
                      } catch (e) {
                        Navigator.pop(ctx);
                        ScaffoldMessenger.of(context)
                            .showSnackBar(SnackBar(content: Text('$e')));
                      }
                    },
                    icon: const Icon(Icons.local_shipping),
                    label: const Text('Accept pickup'),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  void _showCollectorSheet(Map c) {
    showModalBottomSheet(
      context: context,
      showDragHandle: true,
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
          child: Row(
            children: [
              CircleAvatar(
                backgroundColor: Colors.green.shade100,
                child: Icon(Icons.local_shipping,
                    color: Colors.green.shade800),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('${c['name']}',
                        style: const TextStyle(
                            fontSize: 16, fontWeight: FontWeight.bold)),
                    Text('Collector - last seen on the map',
                        style: TextStyle(
                            color: Colors.grey.shade600, fontSize: 12)),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showLiveClientSheet(Map c) {
    showModalBottomSheet(
      context: context,
      showDragHandle: true,
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
          child: Row(
            children: [
              CircleAvatar(
                backgroundColor: Colors.orange.shade100,
                child: Icon(Icons.person, color: Colors.orange.shade800),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('${c['name']}',
                        style: const TextStyle(
                            fontSize: 16, fontWeight: FontWeight.bold)),
                    Text('Client - live location',
                        style: TextStyle(
                            color: Colors.grey.shade600, fontSize: 12)),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _infoRow(IconData icon, String text) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 18, color: Colors.grey.shade700),
            const SizedBox(width: 10),
            Expanded(child: Text(text)),
          ],
        ),
      );

  // ---------- Markers ----------

  List<Marker> get _markers {
    final markers = <Marker>[];

    // Client pickups from order data (collector view only).
    for (final o in _clientOrders) {
      markers.add(
        Marker(
          point: LatLng((o['latitude'] as num).toDouble(),
              (o['longitude'] as num).toDouble()),
          width: 44,
          height: 44,
          child: Tooltip(
            message: '${o['client']['name']} - tap for info',
            child: GestureDetector(
              onTap: () => _showClientSheet(Map<String, dynamic>.from(o)),
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.orange,
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 2),
                  boxShadow: const [
                    BoxShadow(blurRadius: 4, color: Colors.black26)
                  ],
                ),
                child: const Icon(Icons.home,
                    color: Colors.white, size: 22),
              ),
            ),
          ),
        ),
      );
    }

    // Live client locations (collector view � from real-time push).
    for (final c in _clientLocations) {
     final stale = _isStale(c['updatedAt']);
      markers.add(
        Marker(
          point: LatLng((c['latitude'] as num).toDouble(),
              (c['longitude'] as num).toDouble()),
          width: 44,
          height: 44,
          child: Tooltip(
            message: '${c['name']} - ${stale ? 'stale' : 'live'} - tap for info',
            child: GestureDetector(
              onTap: () => _showLiveClientSheet(Map<String, dynamic>.from(c)),
              child: Container(
                decoration: BoxDecoration(
                  color: _staleColor(stale, Colors.orange),
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 2),
                  boxShadow: const [
                    BoxShadow(blurRadius: 4, color: Colors.black26)
                  ],
                ),
                child: const Icon(Icons.person,
                    color: Colors.white, size: 22),
              ),
            ),
          ),
        ),
      );
    }

    // Other collectors (both roles can see).
    for (final c in _collectors) {
      final id = int.tryParse('${c['collectorId']}');
      if (id == _myId) continue;
      final stale = _isStale(c['updatedAt']);
      markers.add(
        Marker(
          point: LatLng((c['latitude'] as num).toDouble(),
              (c['longitude'] as num).toDouble()),
          width: 44,
          height: 44,
          child: Tooltip(
            message: '${c['name']} - ${stale ? 'stale' : 'live'}',
            child: GestureDetector(
              onTap: () => _showCollectorSheet(Map<String, dynamic>.from(c)),
              child: Container(
                decoration: BoxDecoration(
                  color: _staleColor(stale, Colors.green.shade700),
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 2),
                ),
                child: const Icon(Icons.local_shipping,
                    color: Colors.white, size: 22),
              ),
            ),
          ),
        ),
      );
    }

    // Me.
    if (_myPosition != null) {
      markers.add(
        Marker(
          point: LatLng(_myPosition!.latitude, _myPosition!.longitude),
          width: 44,
          height: 44,
          child: Container(
            decoration: BoxDecoration(
              color: Colors.blue,
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white, width: 2),
            ),
            child: const Icon(Icons.person, color: Colors.white, size: 22),
          ),
        ),
      );
    }
    return markers;
  }

  @override
  void dispose() {
    _pushTimer?.cancel();
    _refreshTimer?.cancel();
    _collectorSub?.cancel();
    _clientSub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    Widget body;
    if (_loading) {
      body = const Center(child: CircularProgressIndicator());
    } else if (_error != null) {
      body = Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(_error!, textAlign: TextAlign.center),
            const SizedBox(height: 8),
            FilledButton(onPressed: _load, child: const Text('Retry')),
          ],
        ),
      );
    } else {
      body = Column(
        children: [
          if (_notice != null)
            Container(
              width: double.infinity,
              color: Colors.amber.shade100,
              padding: const EdgeInsets.all(10),
              child: Row(
                children: [
                  const Icon(Icons.warning_amber_rounded,
                      color: Colors.amber, size: 20),
                  const SizedBox(width: 8),
                  Expanded(child: Text(_notice!)),
                ],
              ),
            ),
          Expanded(
            child: Stack(
              children: [
                FlutterMap(
                  mapController: _mapController,
                  options:
                      MapOptions(initialCenter: _center, initialZoom: 14),
                  children: [
                    TileLayer(
                      urlTemplate:
                          'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                      userAgentPackageName: 'com.garbageapp.app',
                    ),
                    MarkerLayer(markers: _markers),
                    const SimpleAttributionWidget(
                      source: Text('OpenStreetMap contributors'),
                    ),
                  ],
                ),
                Positioned(
                  right: 12,
                  bottom: 20,
                  child: Column(
                    children: [
                      _zoomButton(Icons.add, () => _zoomBy(1)),
                      const SizedBox(height: 8),
                      _zoomButton(Icons.remove, () => _zoomBy(-1)),
                      const SizedBox(height: 8),
                      _zoomButton(
                        Icons.my_location,
                        _clientLocations.isNotEmpty || _clientOrders.isNotEmpty
                            ? _centerOnClient
                            : () {},
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Container(
            width: double.infinity,
            color: Theme.of(context).colorScheme.surfaceContainerHighest,
            padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
            child: Row(
              children: [
                Icon(Icons.home,
                    size: 16, color: Colors.orange.shade800),
                const SizedBox(width: 4),
                Text('${_clientOrders.length} pickup(s)'),
                const SizedBox(width: 14),
                Icon(Icons.local_shipping,
                    size: 16, color: Colors.green.shade700),
                const SizedBox(width: 4),
                Text('${_collectors.length} collector(s)'),
                const Spacer(),
                Row(
                  children: [
                    Icon(Icons.circle,
                        size: 10, color: _live ? Colors.green : Colors.grey),
                    const SizedBox(width: 4),
                    Text(_live ? 'LIVE' : 'OFFLINE',
                        style: const TextStyle(fontSize: 12)),
                  ],
                ),
              ],
            ),
          ),
        ],
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Map'),
        actions: [
          IconButton(onPressed: _load, icon: const Icon(Icons.refresh)),
        ],
      ),
      body: body,
    );
  }
}
