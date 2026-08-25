const { fn, col, Op } = require("sequelize");
const sequelize = require("../../config/database");
const { User, ClientProfile } = require("../users/user.model");
const { Order } = require("../orders/order.model");
const {
  Transaction,
  TransactionItem,
} = require("../transactions/transaction.model");
const Material = require("../materials/material.model");
const Feedback = require("../feedback/feedback.model");
const ApiError = require("../../utils/ApiError");

const COMPLETED = ["CONFIRMED", "AUTO_COMPLETED"];

async function kgByMaterial(where) {
  return TransactionItem.findAll({
    attributes: [
      [col("material.name"), "material"],
      [fn("SUM", col("weight_kg")), "totalKg"],
    ],
    include: [
      { model: Material, as: "material", attributes: [] },
      { model: Transaction, as: "Transaction", attributes: [], where },
    ],
    group: ["material.name"],
    raw: true,
  });
}

async function clientStats(clientId) {
  const [bookings, completed, earned, items] = await Promise.all([
    Order.count({ where: { clientId } }),
    Order.count({ where: { clientId, status: { [Op.in]: COMPLETED } } }),
    Transaction.sum("totalAmount", {
      where: { clientId, confirmationStatus: { [Op.in]: COMPLETED } },
    }),
    kgByMaterial({ clientId, confirmationStatus: { [Op.in]: COMPLETED } }),
  ]);

  const profile = await ClientProfile.findOne({ where: { userId: clientId } });

  return {
    role: "CLIENT",
    totalBookings: bookings,
    completedCollections: completed,
    totalEarned: Number(earned || 0),
    kilogramsByMaterial: items.map((r) => ({
      material: r.material,
      totalKg: Number(r.totalKg),
    })),
    rating: profile ? Number(profile.rating) : 0,
  };
}

async function collectorStats(collectorId) {
  const [claimed, completed, paidOut, fees, items] = await Promise.all([
    Order.count({ where: { collectorId } }),
    Order.count({ where: { collectorId, status: { [Op.in]: COMPLETED } } }),
    Transaction.sum("totalAmount", {
      where: { collectorId, confirmationStatus: { [Op.in]: COMPLETED } },
    }),
    sequelize.query(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM wallet_transactions
       WHERE user_id = :id AND type = 'TRANSACTION_DEDUCTION'`,
      { replacements: { id: collectorId }, type: sequelize.QueryTypes.SELECT }
    ),
    kgByMaterial({ collectorId, confirmationStatus: { [Op.in]: COMPLETED } }),
  ]);

  const [profile, ratingAgg] = await Promise.all([
    CollectorProfile.findOne({ where: { userId: collectorId } }),
    Feedback.findAll({
      where: { receiverId: collectorId },
      attributes: [
        [fn("COUNT", col("id")), "count"],
        [fn("AVG", col("rating")), "average"],
      ],
      raw: true,
    }),
  ]);

  return {
    role: "COLLECTOR",
    claimedOrders: claimed,
    completedCollections: completed,
    totalPaidToClients: Number(paidOut || 0),
    ecoinFeesPaid: Number(fees[0] ? fees[0].total : 0),
    kilogramsByMaterial: items.map((r) => ({
      material: r.material,
      totalKg: Number(r.totalKg),
    })),
    feedbackCount: Number(ratingAgg[0] ? ratingAgg[0].count : 0),
    rating:
      ratingAgg[0] && ratingAgg[0].average
        ? Math.round(Number(ratingAgg[0].average) * 10) / 10
        : 0,
    vehicleCount: 0,
  };
}

function parsePeriod(period) {
  if (!period) return null;
  const m = /^(\d{4})-(\d{2})$/.exec(String(period));
  if (!m) throw new ApiError(400, "period must be formatted YYYY-MM");
  const monthIdx = Number(m[2]) - 1;
  if (monthIdx < 0 || monthIdx > 11) {
    throw new ApiError(400, "Invalid month in period");
  }
  return {
    start: new Date(Date.UTC(Number(m[1]), monthIdx, 1)),
    end: new Date(Date.UTC(Number(m[1]), monthIdx + 1, 1)),
  };
}

async function materialsInventory(period) {
  const replacements = period
    ? { start: period.start.toISOString(), end: period.end.toISOString() }
    : {};
  const rangeSql = period
    ? "AND t.created_at >= :start AND t.created_at < :end"
    : "";
  const disposalRangeSql = period
    ? "WHERE d.created_at >= :start AND d.created_at < :end"
    : "";

  const [collectedRows, disposedRows] = await Promise.all([
    sequelize.query(
      `SELECT m.id AS "materialId", m.name AS material,
              COALESCE(SUM(ti.weight_kg), 0) AS collected
       FROM transaction_items ti
       JOIN transactions t ON t.id = ti.transaction_id
       JOIN materials m ON m.id = ti.material_id
       WHERE t.confirmation_status IN ('CONFIRMED','AUTO_COMPLETED') ${rangeSql}
       GROUP BY m.id, m.name`,
      { replacements, type: sequelize.QueryTypes.SELECT }
    ),
    sequelize.query(
      `SELECT m.id AS "materialId", m.name AS material,
              COALESCE(SUM(d.weight_kg), 0) AS disposed
       FROM material_disposals d
       JOIN materials m ON m.id = d.material_id
       ${disposalRangeSql}
       GROUP BY m.id, m.name`,
      { replacements, type: sequelize.QueryTypes.SELECT }
    ),
  ]);

  const byName = new Map();
  for (const row of collectedRows) {
    byName.set(row.material, {
      materialId: Number(row.materialId),
      material: row.material,
      collectedKg: Number(row.collected),
      disposedKg: 0,
    });
  }
  for (const row of disposedRows) {
    const existing = byName.get(row.material) || {
      materialId: Number(row.materialId),
      material: row.material,
      collectedKg: 0,
      disposedKg: 0,
    };
    existing.disposedKg = Number(row.disposed);
    byName.set(row.material, existing);
  }

  return [...byName.values()]
    .filter((r) => r.collectedKg > 0 || r.disposedKg > 0)
    .sort(
      (a, b) =>
        b.collectedKg - a.collectedKg || a.material.localeCompare(b.material)
    )
    .map((r) => ({
      ...r,
      status: r.collectedKg - r.disposedKg > 0 ? "ON_STORAGE" : "DISPOSED",
    }));
}

async function adminStats(periodInput) {
  const period = parsePeriod(periodInput);
  const createdBetween = period
    ? { createdAt: { [Op.gte]: period.start, [Op.lt]: period.end } }
    : {};

  const [
    clients,
    collectors,
    orderRows,
    txCount,
    money,
    inventory,
    [feeAgg],
    balanceRows,
  ] =
    await Promise.all([
      User.count({ where: { role: "CLIENT" } }),
      User.count({ where: { role: "COLLECTOR" } }),
      Order.findAll({
        where: createdBetween,
        attributes: ["status", [fn("COUNT", col("id")), "count"]],
        group: ["status"],
        raw: true,
      }),
      Transaction.count({ where: createdBetween }),
      Transaction.sum("totalAmount", {
        where: {
          ...createdBetween,
          confirmationStatus: { [Op.in]: COMPLETED },
        },
      }),
      materialsInventory(period),
      sequelize.query(
        `SELECT COALESCE(SUM(amount), 0) AS total FROM wallet_transactions
         WHERE type = 'TRANSACTION_DEDUCTION' ${period ? "AND created_at >= :start AND created_at < :end" : ""}`,
        {
          replacements: period
            ? { start: period.start.toISOString(), end: period.end.toISOString() }
            : {},
          type: sequelize.QueryTypes.SELECT,
        }
      ),
      sequelize.query(
        `SELECT u.id AS "id", u.name AS "name", w.balance::float8 AS "balance"
         FROM users u JOIN wallets w ON w.user_id = u.id
         WHERE u.role = 'COLLECTOR'
         ORDER BY w.balance ASC`,
        { type: sequelize.QueryTypes.SELECT }
      ),
    ]);

  const ordersByStatus = {};
  for (const row of orderRows) ordersByStatus[row.status] = Number(row.count);

  return {
    role: "ADMIN",
    period: periodInput || null,
    totalClients: clients,
    totalCollectors: collectors,
    ordersByStatus,
    totalTransactions: txCount,
    totalMoneyProcessed: Number(money || 0),
    totalKilogramsRecycled: inventory.reduce((s, r) => s + r.collectedKg, 0),
    materialsInventory: inventory,
    systemFeePercent: require("../../config/environment").systemFeePercent,
    systemFeesCollected: Number(feeAgg ? feeAgg.total : 0),
    collectorBalances: balanceRows.map((b) => ({
      id: Number(b.id),
      name: b.name,
      balance: Number(b.balance),
    })),
  };
}
module.exports = { clientStats, collectorStats, adminStats };

