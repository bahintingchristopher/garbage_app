import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../services/chat_service.dart';
import '../utils/order_status.dart';
import '../screens/chat_detail_screen.dart';

Widget statusChip(String status) => Container(
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

Future<void> callClient(BuildContext context, Object? number) async {
  final cleaned = '$number'.replaceAll(RegExp(r'[^\d+]'), '');
  if (cleaned.isEmpty) {
    ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No contact number available.')));
    return;
  }
  try {
    await launchUrl(Uri(scheme: 'tel', path: cleaned));
  } catch (_) {
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not open the dialer.')));
    }
  }
}

Future<void> openChat(
    BuildContext context, Object otherUserId, String otherName) async {
  try {
    final chat = ChatService();
    final convId = await chat.startConversation(otherUserId);
    if (!context.mounted) return;
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ChatDetailScreen(
            conversationId: convId, otherName: otherName),
      ),
    );
  } catch (e) {
    if (context.mounted) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }
}

