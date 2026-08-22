import 'package:flutter/material.dart';

import '../services/location_service.dart';
import '../services/material_service.dart';
import '../services/order_service.dart';
import '../services/auth_service.dart';

class BookPickupScreen extends StatefulWidget {
  const BookPickupScreen({super.key});

  @override
  State<BookPickupScreen> createState() => _BookPickupScreenState();
}

class _BookPickupScreenState extends State<BookPickupScreen> {
  final _formKey = GlobalKey<FormState>();
  final _address = TextEditingController();
  final _notes = TextEditingController();
  final _orders = OrderService();
  final _materials = MaterialService();
  final _locationService = LocationService();

  DateTime? _date;
  String _slot = 'MORNING';
  bool _saving = false;
  List<dynamic> _materialList = [];
  final List<Map<String, dynamic>> _items = [];

  static const _slots = ['MORNING', 'AFTERNOON', 'EVENING'];

  @override
  void initState() {
    super.initState();
    _loadSavedAddress();
    _loadMaterials();
    _date = DateTime.now().add(const Duration(days: 1));
    _addItemRow();
  }

  Future<void> _loadSavedAddress() async {
    // Prefill from the address on the user's profile.
    final user = await AuthService().getSavedUser();
    if (user != null && user['address'] != null && mounted) {
      setState(() => _address.text = user['address']);
    }
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _date ?? DateTime.now().add(const Duration(days: 1)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 60)),
    );
    if (picked != null) setState(() => _date = picked);
  }

  String get _dateLabel =>
      '${_date!.year}-${_date!.month.toString().padLeft(2, '0')}-${_date!.day.toString().padLeft(2, '0')}';

  Future<void> _loadMaterials() async {
    try {
      final list = await _materials.listActive();
      if (mounted) setState(() => _materialList = list);
    } catch (_) {}
  }

  double _priceOfMaterial(String? id) {
    for (final m in _materialList) {
      if ('${m['id']}' == '$id') {
        return (m['pricePerKg'] as num?)?.toDouble() ?? 0;
      }
    }
    return 0;
  }

  double _rowTotal(Map<String, dynamic> it) {
    final p =
        double.tryParse((it['price'] as TextEditingController).text.trim()) ??
            0;
    final k =
        double.tryParse((it['kg'] as TextEditingController).text.trim()) ?? 0;
    return p * k;
  }

  double get _grandTotal => _items.fold(0, (sum, it) => sum + _rowTotal(it));

  void _addItemRow() {
    setState(() {
      _items.add({
        'materialId': null,
        'kg': TextEditingController(),
        'price': TextEditingController(),
      });
    });
  }

  void _removeItemRow(int index) {
    setState(() {
      (_items[index]['kg'] as TextEditingController).dispose();
      (_items[index]['price'] as TextEditingController).dispose();
      _items.removeAt(index);
    });
  }

  List<Map<String, dynamic>>? _collectItems() {
    final rows = <Map<String, dynamic>>[];
    for (final it in _items) {
      final materialId = int.tryParse('${it['materialId']}');
      final kgText = (it['kg'] as TextEditingController).text.trim();
      final priceText = (it['price'] as TextEditingController).text.trim();
      if (materialId == null && kgText.isEmpty && priceText.isEmpty) continue;
      final kg = double.tryParse(kgText);
      final price = double.tryParse(priceText);
      if (materialId == null ||
          kg == null ||
          kg <= 0 ||
          price == null ||
          price <= 0) {
        return null;
      }
      rows.add({
        'materialId': materialId,
        'estimatedKg': kg,
        'declaredPricePerKg': price,
      });
    }
    return rows;
  }
  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final items = _collectItems();
    if (items == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Fill in every material row - pick a material and enter an estimated weight above 0.')));
      return;
    }
    if (items.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please add at least one expected material.')));
      return;
    }
    setState(() => _saving = true);
    try {
      // Best-effort GPS so collectors can find you on the map.
      double? lat;
      double? lng;
      try {
        final pos = await _locationService.getCurrent();
        if (pos != null) {
          lat = pos.latitude;
          lng = pos.longitude;
        }
      } catch (_) {}

      await _orders.book(
        pickupAddress: _address.text.trim(),
        scheduledDate: _dateLabel,
        timeSlot: _slot,
        notes: _notes.text,
        items: items,
        latitude: lat,
        longitude: lng,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Pickup booked! Collectors can now see it.')),
      );
      Navigator.pop(context, true);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Book a Pickup')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextFormField(
              controller: _address,
              maxLines: 2,
              decoration: const InputDecoration(
                labelText: 'Pickup address',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.location_on_outlined),
              ),
              validator: (v) =>
                  (v == null || v.trim().isEmpty) ? 'Address is required' : null,
            ),
            const SizedBox(height: 16),
            Card(
              child: ListTile(
                leading: const Icon(Icons.calendar_today),
                title: const Text('Pickup date'),
                subtitle: Text(_dateLabel),
                trailing: const Icon(Icons.edit_calendar_outlined),
                onTap: _pickDate,
              ),
            ),
            const SizedBox(height: 8),
            const Text('Preferred time'),
            Wrap(
              spacing: 8,
              children: _slots
                  .map(
                    (s) => ChoiceChip(
                      label: Text(s[0] + s.substring(1).toLowerCase()),
                      selected: _slot == s,
                      onSelected: (_) => setState(() => _slot = s),
                    ),
                  )
                  .toList(),
            ),
            const SizedBox(height: 16),
            Text('Expected materials:',
                style: Theme.of(context).textTheme.titleSmall),
            const Text(
              'Unit prices use current rates; totals are estimates.',
              style: TextStyle(fontSize: 12, color: Colors.grey),
            ),
            const SizedBox(height: 8),
            for (var i = 0; i < _items.length; i++)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.grey.shade300),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: DropdownButtonFormField<String>(
                              initialValue:
                                  _items[i]['materialId'] as String?,
                              isExpanded: true,
                              decoration: const InputDecoration(
                                labelText: 'Material type',
                                border: OutlineInputBorder(),
                                contentPadding: EdgeInsets.symmetric(
                                    horizontal: 10, vertical: 8),
                              ),
                              items: _materialList
                                  .map((m) => DropdownMenuItem<String>(
                                        value: '${m['id']}',
                                        child: Text(
                                          (m['name'] ?? '').toString(),
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ))
                                  .toList(),
                              onChanged: (v) => setState(() {
                                _items[i]['materialId'] = v;
                                (_items[i]['price']
                                        as TextEditingController)
                                    .text = _priceOfMaterial(v)
                                        .toStringAsFixed(2);
                              }),
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.remove_circle_outline),
                            onPressed: () => _removeItemRow(i),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          SizedBox(
                            width: 110,
                            child: TextFormField(
                              controller: _items[i]['price']
                                  as TextEditingController,
                              readOnly: true,
                              decoration: const InputDecoration(
                                labelText: 'Unit price',
                                prefixText: 'Php ',
                                suffixText: '/kg',
                                border: OutlineInputBorder(),
                                contentPadding: EdgeInsets.symmetric(
                                    horizontal: 10, vertical: 8),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          SizedBox(
                            width: 90,
                            child: TextFormField(
                              controller:
                                  _items[i]['kg'] as TextEditingController,
                              keyboardType: const TextInputType
                                  .numberWithOptions(decimal: true),
                              decoration: const InputDecoration(
                                labelText: 'Est. kg',
                                border: OutlineInputBorder(),
                                contentPadding: EdgeInsets.symmetric(
                                    horizontal: 10, vertical: 8),
                              ),
                              onChanged: (_) => setState(() {}),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'P${_rowTotal(_items[i]).toStringAsFixed(2)}',
                              textAlign: TextAlign.end,
                              style: const TextStyle(
                                  fontWeight: FontWeight.bold),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            TextButton.icon(
              onPressed: _addItemRow,
              icon: const Icon(Icons.add),
              label: const Text('Add material'),
            ),
            if (_items.isNotEmpty)
              Card(
                color: Colors.green.shade50,
                margin: const EdgeInsets.only(top: 4),
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Estimated total',
                          style: TextStyle(fontWeight: FontWeight.bold)),
                      Text(
                        'P${_grandTotal.toStringAsFixed(2)}',
                        style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Colors.green.shade800),
                      ),
                    ],
                  ),
                ),
              ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _notes,
              maxLines: 3,
              maxLength: 500,
              decoration: const InputDecoration(
                labelText: 'Notes for the collector (optional)',
                hintText: 'e.g. Gate code, bags are at the back...',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 8),
            FilledButton.icon(
              onPressed: _saving ? null : _submit,
              icon: _saving
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.local_shipping_outlined),
              label: Text(_saving ? 'Booking...' : 'Book pickup'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    for (final it in _items) {
      (it['kg'] as TextEditingController).dispose();
      (it['price'] as TextEditingController).dispose();
    }
    _address.dispose();
    _notes.dispose();
    super.dispose();
  }
}








