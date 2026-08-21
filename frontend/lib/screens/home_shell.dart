import 'dart:async';

import 'package:flutter/material.dart';
import 'current_screen.dart';
import 'map_screen.dart';
import 'orders_screen.dart';
import 'chat_screen.dart';
import 'menu_screen.dart';
import '../services/chat_service.dart';

class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;
  final _chat = ChatService();
  StreamSubscription<Map<String, dynamic>>? _msgSub;

  @override
  void initState() {
    super.initState();
    // One shared socket for the whole app, connected from login onward.
    _chat.ensureConnected();
    // In-app banner when a message arrives while its chat is not open.
    _msgSub = _chat.incoming.listen(_onIncomingMessage);
  }

  void _onIncomingMessage(Map<String, dynamic> msg) {
    final active = _chat.activeConversationId;
    if (active != null && '$active' == '${msg['conversationId']}') return;
    if (!mounted) return;
    final sender = msg['sender'];
    final name = sender is Map ? '${sender['name']}' : 'Someone';
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text('$name: ${msg['message']}'),
      duration: const Duration(seconds: 3),
    ));
  }

  @override
  void dispose() {
    _msgSub?.cancel();
    super.dispose();
  }
  static const _screens = [
    CurrentScreen(),
    MapScreen(),
    OrdersScreen(),
    ChatScreen(),
    MenuScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(index: _index, children: _screens),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.recycling_outlined),
            selectedIcon: Icon(Icons.recycling),
            label: 'Current',
          ),
          NavigationDestination(
            icon: Icon(Icons.map_outlined),
            selectedIcon: Icon(Icons.map),
            label: 'Map',
          ),
          NavigationDestination(
            icon: Icon(Icons.receipt_long_outlined),
            selectedIcon: Icon(Icons.receipt_long),
            label: 'Orders',
          ),
          NavigationDestination(
            icon: Icon(Icons.chat_bubble_outline),
            selectedIcon: Icon(Icons.chat_bubble),
            label: 'Chat',
          ),
          NavigationDestination(
            icon: Icon(Icons.menu),
            label: 'Menu',
          ),
        ],
      ),
    );
  }
}


