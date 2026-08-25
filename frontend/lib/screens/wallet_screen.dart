import 'package:flutter/material.dart';

import 'package:flutter/services.dart';

import '../services/settings_service.dart';
import '../services/wallet_service.dart';

class WalletScreen extends StatefulWidget {
  const WalletScreen({super.key});

  @override
  State<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends State<WalletScreen> {
  final _wallet = WalletService();
  num _balance = 0;
  List<dynamic> _history = [];
  List<dynamic> _topUps = [];
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
      final results =
          await Future.wait([_wallet.balance(), _wallet.history(), _wallet.myTopUps()]);
      if (!mounted) return;
      setState(() {
        _balance = results[0] as num;
        _history = results[1] as List<dynamic>;
        _topUps = results[2] as List<dynamic>;
      });
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
    if (mounted) setState(() => _loading = false);
  }

  Color _typeColor(Map entry) =>
      entry['direction'] == 'CREDIT' ? Colors.green : Colors.red.shade700;

  IconData _typeIcon(String type) {
    switch (type) {
      case 'TOP_UP':
        return Icons.add_card;
      case 'TRANSACTION_DEDUCTION':
        return Icons.receipt_long;
      case 'REFUND':
        return Icons.replay;
      default:
        return Icons.tune;
    }
  }

  final _settings = SettingsService();

  Future<void> _openTopUpSheet() async {
    Map<String, dynamic>? payment;
    try {
      payment = await _settings.paymentSettings();
    } catch (_) {
      payment = null;
    }
    if (!mounted) return;
    final amountCtrl = TextEditingController();
    final refCtrl = TextEditingController();
    String method = 'GCASH';
    final requested = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheet) => SingleChildScrollView(
          padding: EdgeInsets.fromLTRB(
              16, 16, 16, MediaQuery.of(ctx).viewInsets.bottom + 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text('Request eCoins top-up',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              Text(
                'Send the money via GCash or bank, then file this request. '
                'An admin verifies it before your balance updates.',
                style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
              ),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.blue.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.blue.shade200),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.account_balance_wallet_outlined, size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Admin GCash Number',
                              style: TextStyle(
                                  fontSize: 11, color: Colors.grey.shade700)),
                          Text(
                            (payment?['gcashNumber'] as String?)
                                    ?.isNotEmpty ==
                                true
                                ? payment!['gcashNumber'] as String
                                : 'Not set yet. Please contact the admin.',
                            style: const TextStyle(
                                fontWeight: FontWeight.bold, fontSize: 15),
                          ),
                        ],
                      ),
                    ),
                    if ((payment?['gcashNumber'] as String?)?.isNotEmpty == true)
                      IconButton(
                        icon: const Icon(Icons.copy, size: 18),
                        tooltip: 'Copy GCash number',
                        onPressed: () {
                          Clipboard.setData(ClipboardData(
                              text: payment!['gcashNumber'] as String));
                          ScaffoldMessenger.of(ctx).showSnackBar(const SnackBar(
                              content: Text('GCash number copied')));
                        },
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: amountCtrl,
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(
                  labelText: 'Amount (P)',
                  prefixIcon: Icon(Icons.payments_outlined),
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              SegmentedButton<String>(
                segments: const [
                  ButtonSegment(value: 'GCASH', label: Text('GCash')),
                  ButtonSegment(value: 'BANK', label: Text('Bank')),
                ],
                selected: {method},
                onSelectionChanged: (s) => setSheet(() => method = s.first),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: refCtrl,
                decoration: const InputDecoration(
                  labelText: 'Reference number',
                  hintText: 'From your GCash/bank receipt',
                  prefixIcon: Icon(Icons.confirmation_number_outlined),
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),
              FilledButton.icon(
                onPressed: () => Navigator.pop(ctx, true),
                icon: const Icon(Icons.send),
                label: const Text('Submit request'),
              ),
            ],
          ),
        ),
      ),
    );
    if (requested != true) return;

    final amount = num.tryParse(amountCtrl.text.trim());
    final ref = refCtrl.text.trim();
    if (amount == null || amount <= 0 || ref.isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Valid amount and reference number required')));
      return;
    }
    try {
      await _wallet.requestTopUp(
          amount: amount, paymentMethod: method, referenceNumber: ref);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Request submitted! Waiting for admin approval.')));
      _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  Widget _statusChip(String status) {
    final color = switch (status) {
      'APPROVED' => Colors.green,
      'REJECTED' => Colors.red,
      _ => Colors.orange,
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(status,
          style: TextStyle(
              color: color, fontSize: 11, fontWeight: FontWeight.bold)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('eCoin Wallet')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openTopUpSheet,
        icon: const Icon(Icons.add),
        label: const Text('Top up'),
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
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      Card(
                        color: Colors.green.shade800,
                        child: Padding(
                          padding: const EdgeInsets.all(20),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('eCOIN BALANCE',
                                  style: TextStyle(
                                      color: Colors.green.shade100,
                                      fontSize: 12,
                                      letterSpacing: 1)),
                              const SizedBox(height: 6),
                              Text('P$_balance',
                                  style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 34,
                                      fontWeight: FontWeight.bold)),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),
                      const Text('My top-up requests',
                          style: TextStyle(
                              fontSize: 16, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 8),
                      if (_topUps.isEmpty)
                        const Text('No top-ups yet.',
                            style: TextStyle(color: Colors.grey))
                      else
                        ..._topUps.map((t) => Card(
                              margin: const EdgeInsets.only(bottom: 8),
                              child: ListTile(
                                leading: Icon(
                                    t['paymentMethod'] == 'GCASH'
                                        ? Icons.phone_android
                                        : Icons.account_balance,
                                    color: Colors.blue.shade700),
                                title: Text('P${t['amount']}'),
                                subtitle: Text(
                                    '${t['paymentMethod']} - Ref: ${t['referenceNumber']}'),
                                trailing: _statusChip('${t['status']}'),
                              ),
                            )),
                      const SizedBox(height: 16),
                      const Text('History',
                          style: TextStyle(
                              fontSize: 16, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 8),
                      if (_history.isEmpty)
                        const Text('No transactions yet.',
                            style: TextStyle(color: Colors.grey))
                      else
                        ..._history.map((h) => ListTile(
                              leading: CircleAvatar(
                                backgroundColor:
                                    _typeColor(h).withValues(alpha: 0.15),
                                child: Icon(_typeIcon('${h['type']}'),
                                    size: 20, color: _typeColor(h)),
                              ),
                              title: Text('${h['description']}',
                                  style: const TextStyle(fontSize: 14)),
                              subtitle: Text(
                                  'Balance: P${h['balanceAfter']}',
                                  style: const TextStyle(fontSize: 12)),
                              trailing: Text(
                                  '${h['direction'] == 'CREDIT' ? '+' : '-'}P${h['amount']}',
                                  style: TextStyle(
                                      color: _typeColor(h),
                                      fontWeight: FontWeight.bold)),
                            )),
                      const SizedBox(height: 80),
                    ],
                  ),
                ),
    );
  }
}
