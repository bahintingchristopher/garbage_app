import 'package:flutter/material.dart';

import '../config/api_config.dart';
import '../services/auth_service.dart';
import '../services/order_service.dart';
import '../services/transaction_service.dart';
import 'book_pickup_screen.dart';
import '../utils/order_status.dart';
import 'chat_detail_screen.dart';
import '../services/chat_service.dart';
import 'weighing_screen.dart';

class CurrentScreen extends StatefulWidget {
  const CurrentScreen({super.key});

  @override
  State<CurrentScreen> createState() => _CurrentScreenState();
}

class _CurrentScreenState extends State<CurrentScreen> {
  final _orders = OrderService();
  final _transactions = TransactionService();
  final _chat = ChatService();

  String? _role;
  List<dynamic> _myOrders = [];
  List<dynamic> _available = [];
  Map<String, dynamic>? _pendingTx;
  bool _loading = true;
  String? _error;

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
      _myOrders = await _orders.myOrders();
      if (_role == 'COLLECTOR') {
        _available = await _orders.availableOrders();
        _available = _available.where((o) => o['collector'] == null).toList();
      }
      // If a finished pickup awaits confirmation, load its transaction.
      final pending = _myOrders
          .where((o) => o['status'] == 'COMPLETED_PENDING_CONFIRMATION')
          .toList();
      if (pending.isNotEmpty) {
        try {
          _pendingTx = await _transactions.getByOrder(pending.first['id']);
        } catch (_) {
          _pendingTx = null;
        }
      } else {
        _pendingTx = null;
      }
    } catch (e) {
      _error = e.toString();
    }
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _openBooking() async {
    final booked = await Navigator.push<bool>(
      context,
      MaterialPageRoute(builder: (_) => const BookPickupScreen()),
    );
    if (booked == true) _load();
  }

  Future<void> _cancelOrder(Map order) async {
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

  Future<void> _claim(Map order) async {
    try {
      await _orders.claim(order['id']);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('You claimed order #${order['id']}! Head over when ready.'),
      ));
      _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  Future<void> _advance(Map order) async {
    final next = nextCollectorAction(order['status']);
    if (next == null) return;
    try {
      await _orders.advanceStatus(order['id'], next);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('Status updated to ${statusLabel(next)}'),
      ));
      _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  Future<void> _openWeighing(Map order) async {
    final done = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
          builder: (_) =>
              WeighingScreen(order: Map<String, dynamic>.from(order))),
    );
    if (done == true) _load();
  }

  Future<void> _confirmPayment() async {
    final tx = _pendingTx!;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Confirm payment?'),
        content: Text(
            'Release P${tx['totalAmount']} in eCoins to ${tx['collector']['name']}?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Back')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.green),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Yes, pay'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await _transactions.confirm(tx['id']);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Confirmed! eCoins sent. Thank you for recycling!')));
      _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  Future<void> _disputePayment() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Dispute this transaction?'),
        content: const Text(
            'Our admin team will review the weights and photo. Continue?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('No')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('File dispute'),
          ),
        ],
      ),
    );
    if (ok != true || _pendingTx == null) return;
    try {
      await _transactions.dispute(_pendingTx!['id']);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Dispute filed. Admin will review it.')));
      _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  /// Opens (or creates) the conversation with the other party of an order.
  Future<void> _openChat(Object otherUserId, String otherName) async {
    try {
      final convId = await _chat.startConversation(otherUserId);
      if (!mounted) return;
      await Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => ChatDetailScreen(
              conversationId: convId, otherName: otherName),
        ),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  Widget _statusChip(String status) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: statusColor(status).withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          statusLabel(status),
          style: TextStyle(
            color: statusColor(status),
            fontSize: 12,
            fontWeight: FontWeight.bold,
          ),
        ),
      );

  /// Payment summary shown to the client while awaiting their confirmation.
  Widget _paymentSection() {
    final tx = _pendingTx!;
    final deadline = DateTime.parse(tx['confirmationDeadline']).toLocal();
    final minsLeft = deadline.difference(DateTime.now()).inMinutes.clamp(0, 999);
    final photoUrl = tx['photoUrl'];

    return Card(
      margin: const EdgeInsets.only(top: 12),
      color: Colors.deepOrange.shade50,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.receipt_long, size: 20),
                const SizedBox(width: 8),
                const Text('Pickup complete - review payment',
                    style: TextStyle(fontWeight: FontWeight.bold)),
                const Spacer(),
                Text('${minsLeft}m left',
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade700)),
              ],
            ),
            const Divider(height: 20),
            for (final item in tx['items'])
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 2),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('${item['material']} - ${item['weightKg']} kg x P${item['pricePerKg']}'),
                    Text('P${item['subtotal']}'),
                  ],
                ),
              ),
            const Divider(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Total',
                    style: TextStyle(fontWeight: FontWeight.bold)),
                Text('P${tx['totalAmount']}',
                    style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 18,
                        color: Colors.green.shade800)),
              ],
            ),
            if (photoUrl != null)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.network(
                    '${ApiConfig.fileBase}$photoUrl',
                    height: 140,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    errorBuilder: (c, e, s) =>
                        const Text('(photo unavailable)'),
                  ),
                ),
              ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    style:
                        OutlinedButton.styleFrom(foregroundColor: Colors.red),
                    onPressed: _disputePayment,
                    icon: const Icon(Icons.flag_outlined),
                    label: const Text('Dispute'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: FilledButton.icon(
                    style: FilledButton.styleFrom(
                        backgroundColor: Colors.green),
                    onPressed: _confirmPayment,
                    icon: const Icon(Icons.check_circle_outline),
                    label: const Text('Confirm & Pay'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _clientActiveCard() {
    final active = _myOrders.where((o) => isActiveStatus(o['status'])).toList();
    if (active.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.recycling, size: 72, color: Colors.green.shade300),
            const SizedBox(height: 12),
            const Text('No active pickup',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
            const SizedBox(height: 4),
            const Text('Book one and earn eCoins from your garbage!',
                style: TextStyle(color: Colors.grey)),
            const SizedBox(height: 20),
            FilledButton.icon(
              onPressed: _openBooking,
              icon: const Icon(Icons.add),
              label: const Text('Book a Pickup'),
            ),
          ],
        ),
      );
    }
    final o = active.first;
    final collector = o['collector'];
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Order #${o['id']}',
                        style: const TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 16)),
                    _statusChip(o['status']),
                  ],
                ),
                const Divider(height: 24),
                ListTile(
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.location_on_outlined),
                  title: Text(o['pickupAddress']),
                ),
                ListTile(
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.event_outlined),
                  title: Text('${o['scheduledDate']} - ${o['timeSlot']}'),
                ),
                if (collector != null)
                  ListTile(
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.person_outline),
                    title: Text(collector['name']),
                    subtitle: const Text('Your collector'),
                  ),
                if (o['notes'] != null)
                  ListTile(
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.notes_outlined),
                    title: Text(o['notes']),
                  ),
                if (collector == null && o['status'] == 'BOOKED')
                  const Padding(
                    padding: EdgeInsets.only(top: 8),
                    child: Text('Waiting for a collector to accept...',
                        style: TextStyle(fontStyle: FontStyle.italic)),
                  ),
                const SizedBox(height: 8),
                if (clientCanCancel(o['status']))
                  OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(foregroundColor: Colors.red),
                    onPressed: () => _cancelOrder(o),
                    icon: const Icon(Icons.cancel_outlined),
                    label: const Text('Cancel this pickup'),
                  ),
                if (o['collector'] != null && isActiveStatus(o['status']))
                  OutlinedButton.icon(
                    onPressed: () => _openChat(
                        o['collector']['id'], o['collector']['name']),
                    icon: const Icon(Icons.chat_bubble_outline),
                    label: const Text('Chat with collector'),
                  ),
              ],
            ),
          ),
        ),
        if (o['status'] == 'COMPLETED_PENDING_CONFIRMATION' && _pendingTx != null)
          _paymentSection(),
      ],
    );
  }

  Widget _jobFooter(Map o) {
    if (nextCollectorAction(o['status']) != null) {
      return FilledButton.icon(
        onPressed: () => _advance(o),
        icon: const Icon(Icons.arrow_forward),
        label: Text(nextActionLabel(o['status'])),
      );
    }
    if (o['status'] == 'COLLECTING') {
      return FilledButton.icon(
        onPressed: () => _openWeighing(o),
        icon: const Icon(Icons.scale),
        label: const Text('Enter weights & finish'),
      );
    }
    return const Text(
      'Waiting for the client to confirm...',
      style: TextStyle(color: Colors.grey, fontSize: 12),
    );
  }

  Widget _collectorView() {
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('Available requests',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          if (_available.isEmpty)
            const Card(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: Text('No open requests right now. Check back soon!'),
              ),
            )
          else
            ..._available.map((o) => Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    title: Text(o['pickupAddress'],
                        style: const TextStyle(fontWeight: FontWeight.w600)),
                    subtitle: Text(
                        '${o['scheduledDate']} - ${o['timeSlot']}\n${o['client']['name']}'),
                    isThreeLine: true,
                    trailing: FilledButton(
                      onPressed: () => _claim(o),
                      child: const Text('Accept'),
                    ),
                  ),
                )),
          const SizedBox(height: 16),
          const Text('My jobs',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          ..._myOrders.where((o) => isActiveStatus(o['status'])).map((o) => Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Order #${o['id']}',
                              style: const TextStyle(fontWeight: FontWeight.bold)),
                          _statusChip(o['status']),
                          IconButton(
                            visualDensity: VisualDensity.compact,
                            tooltip: 'Chat with client',
                            icon: const Icon(Icons.chat_bubble_outline,
                                size: 20),
                            onPressed: () =>
                                _openChat(o['client']['id'], o['client']['name']),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(o['pickupAddress']),
                      Text('${o['scheduledDate']} - ${o['timeSlot']}'),
                      const SizedBox(height: 8),
                      _jobFooter(o),
                    ],
                  ),
                ),
              )),
        ],
      ),
    );
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
            const Icon(Icons.cloud_off, size: 48, color: Colors.grey),
            const SizedBox(height: 8),
            Text(_error!, textAlign: TextAlign.center),
            const SizedBox(height: 8),
            FilledButton(onPressed: _load, child: const Text('Retry')),
          ],
        ),
      );
    } else if (_role == 'COLLECTOR') {
      body = _collectorView();
    } else {
      body = _clientActiveCard();
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(_role == 'COLLECTOR' ? 'Jobs' : 'Current Pickup'),
        actions: [
          IconButton(onPressed: _load, icon: const Icon(Icons.refresh)),
        ],
      ),
      floatingActionButton: (_role != 'COLLECTOR' && !_loading && _error == null)
          ? FloatingActionButton.extended(
              onPressed: _openBooking,
              icon: const Icon(Icons.add),
              label: const Text('Book'),
            )
          : null,
      body: body,
    );
  }
}



