const { Op } = require("sequelize");
const sequelize = require("../../config/database");
const ApiError = require("../../utils/ApiError");
const { Wallet } = require("../users/user.model");
const { WalletTransaction } = require("./wallet.model");

async function getWallet(userId, options = {}) {
  const [wallet] = await Wallet.findOrCreate({
    where: { userId },
    defaults: { balance: 0 },
    ...options,
  });
  return wallet;
}

async function getBalance(userId) {
  const wallet = await getWallet(userId);
  return Number(wallet.balance);
}

async function getHistory(userId, limit = 100) {
  return WalletTransaction.findAll({
    where: { userId },
    order: [["createdAt", "DESC"]],
    limit,
  });
}

/// Core ledger writer. MUST be called inside a DB transaction (t).
/// Locks the wallet row to prevent race conditions on concurrent updates.
async function applyChange(
  userId,
  delta,
  type,
  referenceId,
  description,
  t
) {
  const wallet = await Wallet.findOne({
    where: { userId },
    transaction: t,
    lock: t.LOCK.UPDATE,
  });
  if (!wallet) throw new ApiError(404, "Wallet not found");

  const before = Number(wallet.balance);
  const after = Math.round((before + delta) * 100) / 100;

  wallet.balance = after;
  await wallet.save({ transaction: t });

  return WalletTransaction.create(
    {
      userId,
      type,
      amount: Math.abs(delta),
      balanceBefore: before,
      balanceAfter: after,
      referenceId,
      description,
    },
    { transaction: t }
  );
}

/// Charges the system fee (SYSTEM_FEE_PERCENT of the transaction total)
/// to the collector's eCoin wallet. Idempotent: safe to call twice for the
/// same transaction id (e.g. confirm vs auto-complete race).
async function chargeTransactionFee(collectorId, transactionId, totalAmount, t) {
  const { systemFeePercent } = require("../../config/environment");
  const fee =
    Math.round(Number(totalAmount) * (systemFeePercent / 100) * 100) / 100;
  if (!(fee > 0)) return null;
  const referenceId = `tx-${transactionId}`;

  const existing = await WalletTransaction.findOne({
    where: {
      userId: collectorId,
      type: "TRANSACTION_DEDUCTION",
      referenceId,
    },
    transaction: t,
  });
  if (existing) return null;

  return applyChange(
    collectorId,
    -fee,
    "TRANSACTION_DEDUCTION",
    referenceId,
    `${systemFeePercent}% service fee for transaction #${transactionId}`,
    t
  );
}
module.exports = {
  getWallet,
  getBalance,
  getHistory,
  applyChange,
  chargeTransactionFee,
};
