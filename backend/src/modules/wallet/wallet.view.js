function formatWalletTransaction(entry) {
  if (!entry) return null;
  const direction =
    entry.type === "TOP_UP" || entry.type === "REFUND" ? "CREDIT" : "DEBIT";
  return {
    id: entry.id,
    type: entry.type,
    direction,
    amount: Number(entry.amount),
    balanceBefore: Number(entry.balanceBefore),
    balanceAfter: Number(entry.balanceAfter),
    referenceId: entry.referenceId,
    description: entry.description,
    createdAt: entry.createdAt,
  };
}

function formatWalletTransactionList(entries) {
  return (entries || []).map(formatWalletTransaction);
}

function formatTopUp(topUp) {
  if (!topUp) return null;
  return {
    id: topUp.id,
    collectorId: topUp.collectorId,
    collectorName: topUp.collector ? topUp.collector.name : undefined,
    amount: Number(topUp.amount),
    paymentMethod: topUp.paymentMethod,
    referenceNumber: topUp.referenceNumber,
    status: topUp.status,
    reviewedAt: topUp.reviewedAt,
    rejectionReason: topUp.rejectionReason,
    createdAt: topUp.createdAt,
  };
}

function formatTopUpList(topUps) {
  return (topUps || []).map(formatTopUp);
}

module.exports = {
  formatWalletTransaction,
  formatWalletTransactionList,
  formatTopUp,
  formatTopUpList,
};
