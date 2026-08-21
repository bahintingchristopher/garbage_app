import 'package:flutter/material.dart';

/// Statuses that end an order's life.
const finalStatuses = ['CONFIRMED', 'AUTO_COMPLETED', 'CANCELLED', 'DISPUTED'];

bool isActiveStatus(String s) => !finalStatuses.contains(s);

Color statusColor(String s) {
  switch (s) {
    case 'BOOKED':
      return Colors.blue;
    case 'ACCEPTED':
      return Colors.deepPurple;
    case 'ON_THE_WAY':
      return Colors.orange;
    case 'ARRIVED':
      return Colors.teal;
    case 'COLLECTING':
      return Colors.amber.shade700;
    case 'COMPLETED_PENDING_CONFIRMATION':
      return Colors.deepOrange;
    case 'CONFIRMED':
      return Colors.green;
    case 'AUTO_COMPLETED':
      return Colors.green.shade700;
    case 'DISPUTED':
      return Colors.red;
    default:
      return Colors.grey;
  }
}

String statusLabel(String s) {
  switch (s) {
    case 'COMPLETED_PENDING_CONFIRMATION':
      return 'PENDING CONFIRMATION';
    case 'AUTO_COMPLETED':
      return 'AUTO-COMPLETED';
    case 'ON_THE_WAY':
      return 'ON THE WAY';
    default:
      return s;
  }
}

/// The next legal move for the assigned collector, or null.
String? nextCollectorAction(String s) {
  switch (s) {
    case 'ACCEPTED':
      return 'ON_THE_WAY';
    case 'ON_THE_WAY':
      return 'ARRIVED';
    case 'ARRIVED':
      return 'COLLECTING';
    default:
      return null;
  }
}

String nextActionLabel(String status) {
  switch (status) {
    case 'ACCEPTED':
      return 'Start traveling';
    case 'ON_THE_WAY':
      return 'I have arrived';
    case 'ARRIVED':
      return 'Start collecting';
    default:
      return status;
  }
}

bool clientCanCancel(String s) => s == 'BOOKED' || s == 'ACCEPTED';

