function formatTransaction(tx) {
  if (!tx) return null;
  return {
    id: tx.id,
    orderId: tx.orderId,
    status: tx.confirmationStatus,
    totalAmount: Number(tx.totalAmount),
    photoUrl: tx.photo,
    confirmationDeadline: tx.confirmationDeadline,
    completedAt: tx.completedAt,
    items: (tx.items || []).map((item) => ({
      id: item.id,
      material: item.material ? item.material.name : null,
      weightKg: Number(item.weightKg),
      pricePerKg: Number(item.pricePerKg),
      subtotal: Number(item.subtotal),
    })),
    client: tx.client
      ? { id: tx.client.id, name: tx.client.name, accountNumber: tx.client.accountNumber }
      : null,
    collector: tx.collector
      ? { id: tx.collector.id, name: tx.collector.name, accountNumber: tx.collector.accountNumber }
      : null,
    createdAt: tx.createdAt,
  };
}

function formatTransactionList(transactions) {
  return (transactions || []).map(formatTransaction);
}

module.exports = { formatTransaction, formatTransactionList };
