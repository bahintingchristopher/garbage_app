import 'package:flutter/material.dart';

import '../services/announcement_service.dart';
import '../services/auth_service.dart';
import '../services/user_service.dart';
import 'wallet_screen.dart';
import 'login_screen.dart';

class MenuScreen extends StatefulWidget {
  const MenuScreen({super.key});

  @override
  State<MenuScreen> createState() => _MenuScreenState();
}

class _MenuScreenState extends State<MenuScreen> {
  final _userService = UserService();
  final _authService = AuthService();
  final _announcementService = AnnouncementService();

  Future<Map<String, dynamic>?>? _profileFuture;
  List<dynamic>? _announcements;
  String? _announcementsError;

  @override
  void initState() {
    super.initState();
    _profileFuture = _userService.getProfile();
    _loadAnnouncements();
  }

  Future<void> _loadAnnouncements() async {
    try {
      final items = await _announcementService.list();
      if (!mounted) return;
      setState(() {
        _announcements = items;
        _announcementsError = null;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _announcementsError = 'Could not load announcements.');
    }
  }

  Future<void> _reload() async {
    setState(() => _profileFuture = _userService.getProfile());
    setState(() {
      _announcements = null;
      _announcementsError = null;
    });
    _loadAnnouncements();
  }

  Future<void> _logout() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Log out?'),
        content: const Text('You will need to log in again to use the app.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Log out'),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    await _authService.logout();
    if (!mounted) return;

    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
      (route) => false,
    );
  }

  String _roleLabel(String role) {
    switch (role) {
      case 'CLIENT':
        return 'Client';
      case 'COLLECTOR':
        return 'Collector';
      case 'ADMIN':
        return 'Admin';
      default:
        return role;
    }
  }

  IconData _roleIcon(String role) {
    switch (role) {
      case 'CLIENT':
        return Icons.home_outlined;
      case 'COLLECTOR':
        return Icons.local_shipping_outlined;
      case 'ADMIN':
        return Icons.admin_panel_settings_outlined;
      default:
        return Icons.person_outline;
    }
  }

  Widget _infoTile(IconData icon, String label, String value) => ListTile(
        leading: Icon(icon),
        title: Text(label),
        subtitle: Text(value),
      );

  String _formatDate(dynamic iso) {
    final d = DateTime.tryParse('$iso');
    if (d == null) return '';
    return '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
  }

  Widget _announcementCard(Map a, ThemeData theme) => Container(
        width: double.infinity,
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color:
              theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.campaign, size: 16),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    '${a['title']}',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text('${a['content']}'),
            const SizedBox(height: 8),
            Text(_formatDate(a['createdAt']),
                style: TextStyle(fontSize: 11, color: Colors.grey.shade600)),
          ],
        ),
      );

  Widget _announcementsBody(ThemeData theme) {
    if (_announcementsError != null) {
      return Padding(
        padding: const EdgeInsets.all(16),
        child: Text(_announcementsError!,
            style: const TextStyle(color: Colors.red)),
      );
    }
    final items = _announcements;
    if (items == null) {
      return const Padding(
        padding: EdgeInsets.all(16),
        child: Center(child: CircularProgressIndicator()),
      );
    }
    if (items.isEmpty) {
      return const Padding(
        padding: EdgeInsets.all(16),
        child: Text('No announcements yet.',
            style: TextStyle(color: Colors.grey)),
      );
    }
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 4, 12, 8),
      child: Column(
          children: [for (final a in items) _announcementCard(a, theme)]),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Menu')),
      body: RefreshIndicator(
        onRefresh: _reload,
        child: FutureBuilder<Map<String, dynamic>?>(
          future: _profileFuture,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }

            final user = snapshot.data;
            if (user == null) {
              return ListView(
                children: const [
                  SizedBox(height: 120),
                  Icon(Icons.wifi_off, size: 48),
                  SizedBox(height: 12),
                  Center(child: Text('Could not load profile. Pull to retry.')),
                ],
              );
            }

            final role = user['role'] as String? ?? '';
            final wallet = user['wallet'] as Map<String, dynamic>?;

            return ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // ---- Profile header: avatar + name + role chip ----
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 32,
                          child: Text(
                            (user['name'] as String?)?.isNotEmpty == true
                                ? user['name'][0].toUpperCase()
                                : '?',
                            style: theme.textTheme.headlineMedium,
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                user['name'] ?? '',
                                style: theme.textTheme.titleLarge?.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Chip(
                                avatar: Icon(_roleIcon(role), size: 16),
                                label: Text(_roleLabel(role)),
                                visualDensity: VisualDensity.compact,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                // ---- PHP eCoin balance -> Wallet screen ----
                if (wallet != null) ...[
                  const SizedBox(height: 8),
                  Card(
                    color: theme.colorScheme.primaryContainer,
                    child: ListTile(
                      onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(
                              builder: (_) => const WalletScreen())),
                      leading: Container(
                        width: 46,
                        height: 36,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: theme.colorScheme.primary
                              .withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Text(
                          'PHP',
                          style: TextStyle(
                              fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                      ),
                      title: const Text('eCoin Balance'),
                      trailing: const Icon(Icons.chevron_right),
                      subtitle: Text('${wallet['balance']} eCoins',
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          )),
                    ),
                  ),
                ],

                // ---- Submenus ----
                const SizedBox(height: 8),
                Card(
                  clipBehavior: Clip.antiAlias,
                  child: Column(
                    children: [
                      // Profile submenu
                      ExpansionTile(
                        leading: const Icon(Icons.person_outline),
                        title: const Text('Profile'),
                        subtitle: const Text('Account number, contact, address'),
                        childrenPadding:
                            const EdgeInsets.fromLTRB(8, 0, 8, 8),
                        children: [
                          _infoTile(Icons.badge_outlined, 'Account Number',
                              user['accountNumber'] ?? '-'),
                          _infoTile(Icons.email_outlined, 'Email',
                              user['email'] ?? '-'),
                          _infoTile(Icons.phone_outlined, 'Contact Number',
                              user['contactNumber'] ?? '-'),
                          _infoTile(Icons.location_on_outlined, 'Address',
                              user['address'] ?? '-'),
                        ],
                      ),
                      const Divider(height: 1),
                      // Announcements submenu
                      ExpansionTile(
                        leading: const Icon(Icons.campaign_outlined),
                        title: Row(
                          children: [
                            const Text('Announcements'),
                            if (_announcements != null &&
                                _announcements!.isNotEmpty) ...[
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(
                                  color:
                                      theme.colorScheme.primaryContainer,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Text(
                                  '${_announcements!.length}',
                                  style: const TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold),
                                ),
                              ),
                            ],
                          ],
                        ),
                        subtitle: const Text('News and updates'),
                        children: [_announcementsBody(theme)],
                      ),
                      const Divider(height: 1),
                      // Social media submenu (placeholder for now)
                      ExpansionTile(
                        leading: const Icon(Icons.share_outlined),
                        title: const Text('Social Media'),
                        subtitle: const Text('Follow our pages - coming soon'),
                        children: const [
                          Padding(
                            padding: EdgeInsets.all(16),
                            child: Text(
                              'Our official social media accounts are on the way. Stay tuned!',
                              style: TextStyle(color: Colors.grey),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 24),
                FilledButton.tonalIcon(
                  onPressed: _logout,
                  style: FilledButton.styleFrom(
                    foregroundColor: theme.colorScheme.error,
                    backgroundColor:
                        theme.colorScheme.error.withValues(alpha: 0.08),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  icon: const Icon(Icons.logout),
                  label: const Text('Log out'),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}