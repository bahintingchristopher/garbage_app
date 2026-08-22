const { Op } = require("sequelize");
const sequelize = require("../config/database");
const { Transaction } = require("../modules/transactions/transaction.model");
const { Order } = require("../modules/orders/order.model");
const walletService = require("../modules/wallet/wallet.service");

/// Moves PENDING transactions past their confirmation deadline
/// to AUTO_COMPLETED so collectors always get paid.
async function runAutoComplete() {
  const expired = await Transaction.findAll({
    where: {
      confirmationStatus: "PENDING",
      confirmationDeadline: { [Op.lt]: new Date() },
    },
    attributes: ["id", "orderId", "collectorId"],
  });

  if (expired.length === 0) return 0;

  await sequelize.transaction(async (t) => {
    await Transaction.update(
      { confirmationStatus: "AUTO_COMPLETED" },
      { where: { id: { [Op.in]: expired.map((x) => x.id) } }, transaction: t }
    );
    await Order.update(
      { status: "AUTO_COMPLETED" },
      { where: { id: { [Op.in]: expired.map((x) => x.orderId) } }, transaction: t }
    );
    for (const tx of expired) {
      await walletService.chargeTransactionFee(tx.collectorId, tx.id, tx.totalAmount, t);
    }
  });

  console.log(`[job] Auto-completed ${expired.length} transaction(s)`);
  return expired.length;
}

function startAutoCompleteJob(intervalMs = 60000) {
  const tick = () =>
    runAutoComplete().catch((err) =>
      console.error("[job] autoComplete failed:", err.message)
    );

  tick(); // run once at startup
  const timer = setInterval(tick, intervalMs);
  timer.unref?.();
  console.log(`[job] Auto-complete running every ${Math.round(intervalMs / 1000)}s`);
}

module.exports = { runAutoComplete, startAutoCompleteJob };


