import 'package:flutter/material.dart';

import '../services/order_service.dart';
import '../utils/order_status.dart';
import '../widgets/shared_widgets.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  final _orders = OrderService();
  List<dynamic> _ordersList = [];
  bool _loading = true;
  String? _error;
  String _filter = 'ALL';

  static const _filters = ['ALL', 'ACTIVE', 'DONE'];

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
      _ordersList = await _orders.myOrders();
    } catch (e) {
      _error = e.toString();
    }
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _cancel(Map order) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cancel this pickup?'),
        content: Text('Order #${order['id']} at ${order['pickupAddress']}'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Keep it')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Cancel pickup'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await _orders.cancel(order['id']);
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Pickup cancelled')));
      _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  /// One-line summary of the client's declared materials + estimated total.
  String _estimateLine(Map o) {
    final items = (o['declaredItems'] as List?) ?? [];
    if (items.isEmpty) return '';
    final est = items.fold<double>(
        0, (s, d) => s + ((d['subtotal'] as num?) ?? 0).toDouble());
    final names = items
        .map((d) => '${d['material']} ~${d['estimatedKg']}kg')
        .join(', ');
    return '$names - est. P${est.toStringAsFixed(2)}';
  }

  List<dynamic> get _filtered {
    if (_filter == 'ACTIVE') return _ordersList.where((o) => isActiveStatus(o['status'])).toList();
    if (_filter == 'DONE') return _ordersList.where((o) => !isActiveStatus(o['status'])).toList();
    return _ordersList;
  }



  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Orders'),
        actions: [
          IconButton(onPressed: _load, icon: const Icon(Icons.refresh)),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(_error!, textAlign: TextAlign.center),
                      const SizedBox(height: 8),
                      FilledButton(onPressed: _load, child: const Text('Retry')),
                    ],
                  ),
                )
              : Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.all(12),
                      child: SegmentedButton<String>(
                        segments: _filters
                            .map((f) => ButtonSegment(value: f, label: Text(f)))
                            .toList(),
                        selected: {_filter},
                        onSelectionChanged: (s) => setState(() => _filter = s.first),
                      ),
                    ),
                    Expanded(
                      child: RefreshIndicator(
                        onRefresh: _load,
                        child: _filtered.isEmpty
                            ? ListView(
                                children: const [
                                  SizedBox(height: 120),
                                  Icon(Icons.receipt_long, size: 64, color: Colors.grey),
                                  SizedBox(height: 8),
                                  Center(child: Text('Nothing here yet')),
                                ],
                              )
                            : ListView.builder(
                                padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                                itemCount: _filtered.length,
                                itemBuilder: (context, i) {
                                  final o = _filtered[i];
                                  final other = o['client'] ?? o['collector'];
                                  return Card(
                                    margin: const EdgeInsets.only(bottom: 10),
                                    child: ListTile(
                                      title: Row(
                                        children: [
                                          Text('Order #${o['id']}',
                                              style: const TextStyle(fontWeight: FontWeight.bold)),
                                          const Spacer(),
                                          statusChip(o['status']),
                                        ],
                                      ),
                                      subtitle: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          const SizedBox(height: 4),
                                          Text(o['pickupAddress'],
                                              maxLines: 1, overflow: TextOverflow.ellipsis),
                                          Text('${o['scheduledDate']} - ${o['timeSlot']}'),
                                          if (other != null) Text(other['name']),
                                          if (_estimateLine(o).isNotEmpty) ...[
                                            const SizedBox(height: 2),
                                            Text(
                                              _estimateLine(o),
                                              maxLines: 2,
                                              overflow: TextOverflow.ellipsis,
                                              style: TextStyle(
                                                  fontSize: 12,
                                                  color: Colors.grey.shade600),
                                            ),
                                          ],
                                        ],
                                      ),
                                      trailing: (o['collector'] == null &&
                                              clientCanCancel(o['status']))
                                          ? IconButton(
                                              icon: const Icon(Icons.cancel_outlined,
                                                  color: Colors.red),
                                              tooltip: 'Cancel',
                                              onPressed: () => _cancel(o),
                                            )
                                          : null,
                                    ),
                                  );
                                },
                              ),
                      ),
                    ),
                  ],
                ),
    );
  }
}


