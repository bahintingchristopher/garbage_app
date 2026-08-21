const { fn, col, Op } = require("sequelize");
const sequelize = require("../../config/database");
const { User, ClientProfile, CollectorProfile } = require("../users/user.model");
const { Order } = require("../orders/order.model");
const {
  Transaction,
  TransactionItem,
} = require("../transactions/transaction.model");
const Material = require("../materials/material.model");
const Feedback = require("../feedback/feedback.model");

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
    vehicleCount: profile ? undefined : undefined,
  };
}

async function adminStats() {
  const [clients, collectors, orderRows, txCount, money, weight, topMaterials] =
    await Promise.all([
      User.count({ where: { role: "CLIENT" } }),
      User.count({ where: { role: "COLLECTOR" } }),
      Order.findAll({
        attributes: ["status", [fn("COUNT", col("id")), "count"]],
        group: ["status"],
        raw: true,
      }),
      Transaction.count(),
      Transaction.sum("totalAmount", {
        where: { confirmationStatus: { [Op.in]: COMPLETED } },
      }),
      TransactionItem.sum("weight_kg"),
      kgByMaterial({ confirmationStatus: { [Op.in]: COMPLETED } }),
    ]);

  const ordersByStatus = {};
  for (const row of orderRows) ordersByStatus[row.status] = Number(row.count);

  return {
    role: "ADMIN",
    totalClients: clients,
    totalCollectors: collectors,
    ordersByStatus,
    totalTransactions: txCount,
    totalMoneyProcessed: Number(money || 0),
    totalKilogramsRecycled: Number(weight || 0),
    kilogramsByMaterial: topMaterials.map((r) => ({
      material: r.material,
      totalKg: Number(r.totalKg),
    })),
  };
}

module.exports = { clientStats, collectorStats, adminStats };

