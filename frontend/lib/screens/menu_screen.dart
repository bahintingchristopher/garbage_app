import 'package:flutter/material.dart';

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

  Future<Map<String, dynamic>?>? _profileFuture;

  @override
  void initState() {
    super.initState();
    _profileFuture = _userService.getProfile();
  }

  Future<void> _reload() async {
    setState(() => _profileFuture = _userService.getProfile());
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
                if (wallet != null) ...[
                  const SizedBox(height: 8),
                  Card(
                    color: theme.colorScheme.primaryContainer,
                    child: ListTile(
                      onTap: () => Navigator.push(context,
                          MaterialPageRoute(builder: (_) => const WalletScreen())),
                      leading: const Icon(Icons.monetization_on, size: 36),
                      title: const Text('eCoin Balance'),
                      trailing: const Icon(Icons.chevron_right),
                      subtitle: Text(
                          '${wallet['balance']} eCoins',
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                    ),
                  ),
                ],
                const SizedBox(height: 8),
                Card(
                  child: Column(
                    children: [
                      ListTile(
                        leading: const Icon(Icons.badge_outlined),
                        title: const Text('Account Number'),
                        subtitle: Text(user['accountNumber'] ?? '-'),
                      ),
                      const Divider(height: 1),
                      ListTile(
                        leading: const Icon(Icons.email_outlined),
                        title: const Text('Email'),
                        subtitle: Text(user['email'] ?? '-'),
                      ),
                      const Divider(height: 1),
                      ListTile(
                        leading: const Icon(Icons.phone_outlined),
                        title: const Text('Contact Number'),
                        subtitle: Text(user['contactNumber'] ?? '-'),
                      ),
                      const Divider(height: 1),
                      ListTile(
                        leading: const Icon(Icons.location_on_outlined),
                        title: const Text('Address'),
                        subtitle: Text(user['address'] ?? '-'),
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

