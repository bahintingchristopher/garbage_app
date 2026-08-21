import 'dart:async';

import 'package:flutter/material.dart';

import '../services/auth_service.dart';
import '../services/chat_service.dart';

class ChatDetailScreen extends StatefulWidget {
  final Object conversationId;
  final String otherName;

  const ChatDetailScreen({
    super.key,
    required this.conversationId,
    required this.otherName,
  });

  @override
  State<ChatDetailScreen> createState() => _ChatDetailScreenState();
}

class _ChatDetailScreenState extends State<ChatDetailScreen> {
  final _chat = ChatService();
  final _input = TextEditingController();
  final _scroll = ScrollController();
  List<dynamic> _messages = [];
  bool _sending = false;
  String? _error;
  StreamSubscription<Map<String, dynamic>>? _sub;

  @override
  void initState() {
    super.initState();
    _loadMyId();
    _load();
    _chat.ensureConnected();
    _chat.activeConversationId = widget.conversationId;
    // Real-time: every message (mine + theirs) arrives via the shared stream.
    _sub = _chat.onMessage(_onIncoming);
  }

  void _onIncoming(Map<String, dynamic> msg) {
    if ('${msg['conversationId']}' != '${widget.conversationId}') return;
    if (_messages.any((m) => '${m['id']}' == '${msg['id']}')) return;
    if (!mounted) return;
    setState(() => _messages.add(msg));
    _scrollToBottom();
  }

  Future<void> _load() async {
    try {
      final rows = await _chat.messages(widget.conversationId);
      if (!mounted) return;
      setState(() {
        _messages = rows;
        _error = null;
      });
      _scrollToBottom();
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) {
        _scroll.animateTo(
          _scroll.position.maxScrollExtent,
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _send() async {
    final text = _input.text.trim();
    if (text.isEmpty || _sending) return;
    setState(() => _sending = true);
    _input.clear();
    try {
      final msg = await _chat.send(widget.conversationId, text);
      if (!mounted) return;
      if (!_messages.any((m) => '${m['id']}' == '${msg['id']}')) {
        setState(() => _messages.add(msg));
        _scrollToBottom();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.toString())));
        _input.text = text; // restore unsent message
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  String? _myId;

  bool _isMine(Map msg) => '${msg['sender']['id']}' == _myId;

  Future<void> _loadMyId() async {
    final user = await AuthService().getSavedUser();
    if (user != null && mounted) {
      setState(() => _myId = '${user['id']}');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.otherName)),
      body: Column(
        children: [
          Expanded(
            child: _error != null && _messages.isEmpty
                ? Center(child: Text(_error!))
                : ListView.builder(
                    controller: _scroll,
                    padding: const EdgeInsets.all(12),
                    itemCount: _messages.length,
                    itemBuilder: (context, i) {
                      final m = Map<String, dynamic>.from(_messages[i]);
                      final mine = _isMine(m);
                      return Align(
                        alignment: mine
                            ? Alignment.centerRight
                            : Alignment.centerLeft,
                        child: Container(
                          margin: const EdgeInsets.symmetric(vertical: 3),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 10),
                          constraints: BoxConstraints(
                              maxWidth:
                                  MediaQuery.of(context).size.width * 0.75),
                          decoration: BoxDecoration(
                            color: mine
                                ? Colors.green.shade700
                                : Colors.grey.shade300,
                            borderRadius: BorderRadius.only(
                              topLeft: const Radius.circular(16),
                              topRight: const Radius.circular(16),
                              bottomLeft:
                                  Radius.circular(mine ? 16 : 4),
                              bottomRight:
                                  Radius.circular(mine ? 4 : 16),
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${m['message']}',
                                style: TextStyle(
                                    color: mine
                                        ? Colors.white
                                        : Colors.black87),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                _timeOf(m),
                                style: TextStyle(
                                    fontSize: 10,
                                    color: mine
                                        ? Colors.white70
                                        : Colors.black45),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 4, 12, 8),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _input,
                      textCapitalization: TextCapitalization.sentences,
                      decoration: InputDecoration(
                        hintText: 'Message...',
                        filled: true,
                        fillColor: Colors.grey.shade100,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24),
                          borderSide: BorderSide.none,
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 8),
                      ),
                      onSubmitted: (_) => _send(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  CircleAvatar(
                    backgroundColor: Colors.green.shade700,
                    child: IconButton(
                      icon: const Icon(Icons.send,
                          color: Colors.white, size: 20),
                      onPressed: _send,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _timeOf(Map m) {
    final t = DateTime.tryParse('${m['createdAt']}')?.toLocal();
    if (t == null) return '';
    return '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';
  }

  @override
  void dispose() {
    _chat.activeConversationId = null;
    _sub?.cancel();
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }
}


