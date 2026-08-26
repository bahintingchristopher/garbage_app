import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../services/material_service.dart';
import '../services/order_service.dart';
import '../services/transaction_service.dart';
import '../config/api_config.dart';

class _WeightRow {
  String? materialId;
  final weightCtrl = TextEditingController();

  void dispose() => weightCtrl.dispose();
}

class WeighingScreen extends StatefulWidget {
  final Map<String, dynamic> order;
  const WeighingScreen({super.key, required this.order});

  @override
  State<WeighingScreen> createState() => _WeighingScreenState();
}

class _WeighingScreenState extends State<WeighingScreen> {
  final _materials = MaterialService();
  final _orders = OrderService();
  final _transactions = TransactionService();

  List<dynamic> _materialList = [];
  final List<_WeightRow> _rows = [_WeightRow()];
  bool _loading = true;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadMaterials();
  }

  bool _prefilled = false;

  /// Prefill rows from the client's declared estimate when available.
  void _prefillFromDeclaration() {
    final declared = widget.order['declaredItems'];
    if (declared is! List || declared.isEmpty) return;
    final rows = <_WeightRow>[];
    for (final d in declared) {
      final r = _WeightRow();
      r.materialId = '${d['materialId']}';
      r.weightCtrl.text = '${d['estimatedKg']}';
      rows.add(r);
    }
    for (final r in _rows) {
      r.dispose();
    }
    _rows
      ..clear()
      ..addAll(rows);
    _prefilled = true;
  }

  Future<void> _loadMaterials() async {
    try {
      _materialList = await _materials.listActive();
      _prefillFromDeclaration();
    } catch (e) {
      _error = e.toString();
    }
    if (mounted) setState(() => _loading = false);
  }

  double _priceOf(String? materialId) {
    for (final m in _materialList) {
      if ('${m['id']}' == '$materialId') return (m['pricePerKg'] as num).toDouble();
    }
    return 0;
  }


  double get _total {
    var sum = 0.0;
    for (final r in _rows) {
      final w = double.tryParse(r.weightCtrl.text) ?? 0;
      sum += w * _priceOf(r.materialId);
    }
    return sum;
  }

  double get _fee => _total * ApiConfig.systemFeePercent / 100;

  double get _netToHand => _total - _fee;

  Future<void> _submit() async {
    final items = <Map<String, dynamic>>[];
    for (final r in _rows) {
      final w = double.tryParse(r.weightCtrl.text);
      if (r.materialId == null || w == null || w <= 0) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
            content: Text('Every row needs a material and a weight above 0')));
        return;
      }
      items.add({'materialId': int.parse(r.materialId!), 'weightKg': w});
    }

    setState(() => _saving = true);
    try {
      final tx = await _orders.submitWeights(widget.order['id'], items);
      if (!mounted) return;
      await _offerPhotoUpload(tx['id']);
      if (!mounted) return;
      Navigator.pop(context, true);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.toString())));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  /// Optional proof photo right after weighing.
  Future<void> _offerPhotoUpload(Object transactionId) async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Padding(
              padding: EdgeInsets.all(12),
              child: Text('Attach proof photo (optional)',
                  style: TextStyle(fontWeight: FontWeight.bold)),
            ),
            ListTile(
              leading: const Icon(Icons.photo_camera),
              title: const Text('Take photo'),
              onTap: () => Navigator.pop(ctx, ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library),
              title: const Text('Choose from gallery'),
              onTap: () => Navigator.pop(ctx, ImageSource.gallery),
            ),
            ListTile(
              leading: const Icon(Icons.skip_next),
              title: const Text('Skip for now'),
              onTap: () => Navigator.pop(ctx),
            ),
          ],
        ),
      ),
    );
    if (source == null) return;

    final picked = await ImagePicker().pickImage(
      source: source,
      maxWidth: 1600,
      imageQuality: 80,
    );
    if (picked == null) return;

    try {
      await _transactions.uploadPhoto(transactionId, picked.path);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Photo attached!')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text('Weights saved, but photo failed: $e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
          title: Text('Weighing - Order #${widget.order['id']}')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!))
              : ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    const Text(
                      'Enter the weight of each material collected.',
                      style: TextStyle(color: Colors.grey),
                    ),
                    if (_prefilled)
                      const Padding(
                        padding: EdgeInsets.only(top: 4),
                        child: Text(
                          "Prefilled from the client's declared estimate - adjust to actual weights.",
                          style: TextStyle(fontSize: 12, color: Colors.green),
                        ),
                      ),
                    const SizedBox(height: 12),
                    for (var i = 0; i < _rows.length; i++) _buildRow(i),
                    OutlinedButton.icon(
                      onPressed: () =>
                          setState(() => _rows.add(_WeightRow())),
                      icon: const Icon(Icons.add),
                      label: const Text('Add material'),
                    ),
                    const SizedBox(height: 16),
                    Card(
                      color: Colors.green.shade50,
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text('Gross total'),
                                Text('P${_total.toStringAsFixed(2)}'),
                              ],
                            ),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                    'Service fee (${ApiConfig.systemFeePercent}%)'),
                                Text('-P${_fee.toStringAsFixed(2)}'),
                              ],
                            ),
                            const Divider(height: 16),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text('Cash to hand the client',
                                    style: TextStyle(
                                        fontWeight: FontWeight.bold)),
                                Text('P${_netToHand.toStringAsFixed(2)}',
                                    style: TextStyle(
                                        fontSize: 20,
                                        fontWeight: FontWeight.bold,
                                        color: Colors.green.shade800)),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    FilledButton.icon(
                      onPressed: _saving ? null : _submit,
                      icon: _saving
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child:
                                  CircularProgressIndicator(strokeWidth: 2))
                          : const Icon(Icons.check_circle_outline),
                      label: Text(_saving
                          ? 'Submitting...'
                          : 'Submit weights & finish'),
                    ),
                    const SizedBox(height: 8),
                    const Center(
                      child: Text(
                        'The client then confirms to release your eCoins.',
                        style: TextStyle(fontSize: 12, color: Colors.grey),
                      ),
                    ),
                  ],
                ),
    );
  }

  Widget _buildRow(int index) {
    final row = _rows[index];
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(8),
        child: Row(
          children: [
            Expanded(
              flex: 3,
              child: DropdownButtonFormField<String>(
                isExpanded: true,
                initialValue: row.materialId,
                decoration: const InputDecoration(
                  labelText: 'Material',
                  border: OutlineInputBorder(),
                ),
                items: _materialList
                    .map((m) => DropdownMenuItem(
                          value: '${m['id']}',
                          child: Text(
                              '${m['name']} (P${m['pricePerKg']}/kg)',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis),
                        ))
                    .toList(),
                onChanged: (v) => setState(() {
                  row.materialId = v;
                }),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              flex: 2,
              child: TextFormField(
                controller: row.weightCtrl,
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(
                  labelText: 'kg',
                  border: OutlineInputBorder(),
                ),
                onChanged: (_) => setState(() {}),
              ),
            ),
            IconButton(
              icon: const Icon(Icons.remove_circle_outline,
                  color: Colors.red),
              onPressed: _rows.length == 1
                  ? null
                  : () => setState(() {
                        _rows[index].dispose();
                        _rows.removeAt(index);
                      }),
            ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    for (final r in _rows) {
      r.dispose();
    }
    super.dispose();
  }
}



