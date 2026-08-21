import 'dart:async';

import 'package:flutter/material.dart';

import '../services/chat_service.dart';
import 'chat_detail_screen.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _chat = ChatService();
  List<dynamic> _conversations = [];
  bool _loading = true;
  String? _error;
  StreamSubscription<Map<String, dynamic>>? _sub;

  @override
  void initState() {
    super.initState();
    _chat.ensureConnected();
    _sub = _chat.onMessage((_) => _load()); // live refresh on new messages
    _load();
  }

  Future<void> _load() async {
    try {
      final rows = await _chat.conversations();
      if (!mounted) return;
      setState(() {
        _conversations = rows;
        _error = null;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  Future<void> _open(Map conv) async {
    final other =
        (conv['participants'] as List).isNotEmpty ? conv['participants'].first : null;
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ChatDetailScreen(
          conversationId: conv['id'],
          otherName: other?['name'] ?? 'Chat',
        ),
      ),
    );
    _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Chat')),
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
              : _conversations.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.chat_bubble_outline,
                              size: 64, color: Colors.grey.shade400),
                          const SizedBox(height: 12),
                          const Text('No conversations yet'),
                          const SizedBox(height: 4),
                          const Text(
                            'Open a pickup and tap "Chat" to start one.',
                            style: TextStyle(color: Colors.grey, fontSize: 12),
                          ),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.builder(
                        itemCount: _conversations.length,
                        itemBuilder: (context, i) {
                          final conv = _conversations[i];
                          final others = conv['participants'] as List;
                          final last = conv['lastMessage'];
                          return ListTile(
                            leading: CircleAvatar(
                              child: Text(
                                  others.isNotEmpty
                                      ? '${others.first['name']?[0] ?? '?'}'
                                      : '?',
                                  style: const TextStyle(fontSize: 16)),
                            ),
                            title: Text(
                              others.isNotEmpty
                                  ? others.map((p) => p['name']).join(', ')
                                  : 'Chat',
                              style:
                                  const TextStyle(fontWeight: FontWeight.w600),
                            ),
                            subtitle: last == null
                                ? const Text('Say hello!')
                                : Text('${last['message']}',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis),
                            trailing: ((conv['unreadCount'] as num?) ?? 0) > 0
                                ? CircleAvatar(
                                    radius: 10,
                                    backgroundColor: Colors.green.shade700,
                                    child: Text(
                                      '${conv['unreadCount']}',
                                      style: const TextStyle(
                                          fontSize: 11, color: Colors.white),
                                    ),
                                  )
                                : null,
                            onTap: () => _open(conv),
                          );
                        },
                      ),
                    ),
    );
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }
}

