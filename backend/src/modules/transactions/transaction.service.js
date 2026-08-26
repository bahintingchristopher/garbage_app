const { Op } = require("sequelize");
const sequelize = require("../../config/database");
const ApiError = require("../../utils/ApiError");
const { Order } = require("../orders/order.model");
const Material = require("../materials/material.model");
const {
  Transaction,
  TransactionItem,
} = require("./transaction.model");
const walletService = require("../wallet/wallet.service");
const settingService = require("../settings/setting.service");

const CONFIRMATION_WINDOW_MS = 60 * 60 * 1000; // 1 hour

async function getFullById(id, opts = {}) {
  if (Number.isNaN(Number(id))) throw new ApiError(404, "Transaction not found");
  const tx = await Transaction.findByPk(id, {
    ...opts,
    include: [
      {
        model: TransactionItem,
        as: "items",
        include: [{ model: Material, as: "material", attributes: ["name"] }],
      },
      {
        model: require("../users/user.model").User,
        as: "client",
        attributes: ["id", "name", "accountNumber", "contactNumber"],
      },
      {
        model: require("../users/user.model").User,
        as: "collector",
        attributes: ["id", "name", "accountNumber", "contactNumber"],
      },
    ],
  });
  if (!tx) throw new ApiError(404, "Transaction not found");
  return tx;
}

/// Collector submits weights while order is COLLECTING.
/// ALL money math happens here from DB prices - never trust client totals.
async function submitWeights(orderId, collectorId, items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, "items array is required (materialId + weightKg)");
  }

  const seen = new Set();
  for (const item of items) {
    if (!item.materialId) throw new ApiError(400, "Each item needs materialId");
    const weight = Number(item.weightKg);
    if (!weight || weight <= 0) {
      throw new ApiError(400, "Each item needs a positive weightKg");
    }
    if (seen.has(Number(item.materialId))) {
      throw new ApiError(400, "Duplicate material in items list");
    }
    seen.add(Number(item.materialId));
  }

  const order = await Order.findByPk(orderId);
  if (!order) throw new ApiError(404, "Order not found");
  if (Number(order.collectorId) !== Number(collectorId)) {
    throw new ApiError(403, "This order is assigned to another collector");
  }
  if (order.status !== "COLLECTING") {
    throw new ApiError(
      400,
      `Weights can only be submitted while COLLECTING (current: ${order.status})`
    );
  }

  const existing = await Transaction.findOne({ where: { orderId } });
  if (existing) {
    throw new ApiError(409, "A transaction already exists for this order");
  }

  const materials = await Material.findAll({
    where: { id: { [Op.in]: items.map((i) => Number(i.materialId)) }, isActive: true },
  });
  if (materials.length !== items.length) {
    throw new ApiError(
      400,
      "One or more materials are invalid or inactive. Check /api/materials"
    );
  }
  const priceMap = new Map(materials.map((m) => [Number(m.id), m]));

  let total = 0;
  const rows = items.map((item) => {
    const material = priceMap.get(Number(item.materialId));
    const weight = Number(item.weightKg);
    const price = Number(material.pricePerKg);
    const subtotal = Math.round(weight * price * 100) / 100;
    total += subtotal;
    return {
      materialId: material.id,
      weightKg: weight,
      pricePerKg: price,
      subtotal,
    };
  });
  total = Math.round(total * 100) / 100;
  const systemFeePercent = await settingService.getSystemFee();
  const systemFee =
    Math.round(total * (systemFeePercent / 100) * 100) / 100;

  const deadline = new Date(Date.now() + CONFIRMATION_WINDOW_MS);

  return sequelize.transaction(async (t) => {
    const tx = await Transaction.create(
      {
        orderId,
        clientId: order.clientId,
        collectorId,
        totalAmount: total,
      systemFee,
        confirmationStatus: "PENDING",
        confirmationDeadline: deadline,
        completedAt: new Date(),
      },
      { transaction: t }
    );

    await TransactionItem.bulkCreate(
      rows.map((r) => ({ ...r, transactionId: tx.id })),
      { transaction: t }
    );

    await order.update(
      { status: "COMPLETED_PENDING_CONFIRMATION" },
      { transaction: t }
    );

    return getFullById(tx.id, { transaction: t });
  });
}

async function addPhoto(transactionId, collectorId, filePath) {
  const tx = await Transaction.findByPk(transactionId);
  if (!tx) throw new ApiError(404, "Transaction not found");
  if (Number(tx.collectorId) !== Number(collectorId)) {
    throw new ApiError(403, "You can only attach photos to your own transactions");
  }
  if (tx.confirmationStatus !== "PENDING") {
    throw new ApiError(400, "Photo can only be added while PENDING confirmation");
  }
  tx.photo = filePath;
  await tx.save();
  return getFullById(tx.id);
}

/// The transaction belonging to an order (client/collector of that order only).
async function findByOrder(orderId, user) {
  const tx = await Transaction.findOne({ where: { orderId } });
  if (!tx) throw new ApiError(404, "No transaction for this order yet");
  const isOwner =
    Number(tx.clientId) === Number(user.id) ||
    Number(tx.collectorId) === Number(user.id);
  if (!isOwner && user.role !== "ADMIN") {
    throw new ApiError(403, "You do not have access to this transaction");
  }
  return getFullById(tx.id);
}

async function confirm(transactionId, userId, { force = false } = {}) {
  const tx = await Transaction.findByPk(transactionId);
  if (!tx) throw new ApiError(404, "Transaction not found");
  if (!force && Number(tx.clientId) !== Number(userId)) {
    throw new ApiError(403, "Only the client of this transaction can confirm it");
  }
  if (tx.confirmationStatus !== "PENDING") {
    throw new ApiError(400, `Transaction is already ${tx.confirmationStatus}`);
  }

  return sequelize.transaction(async (t) => {
    tx.confirmationStatus = "CONFIRMED";
    await tx.save({ transaction: t });
    await Order.update(
      { status: "CONFIRMED" },
      { where: { id: tx.orderId }, transaction: t }
    );

    // Deduct the collector service fee (idempotent, same DB transaction)
    await walletService.chargeTransactionFee(tx.collectorId, tx.id, tx.totalAmount, t);

    return getFullById(tx.id, { transaction: t });
  });
}

/// All unconfirmed transactions, oldest deadline first (admin review queue).
async function listPending() {
  return Transaction.findAll({
    where: { confirmationStatus: "PENDING" },
    include: [
      {
        model: TransactionItem,
        as: "items",
        include: [{ model: Material, as: "material", attributes: ["name"] }],
      },
      {
        model: require("../users/user.model").User,
        as: "client",
        attributes: ["id", "name", "accountNumber", "contactNumber"],
      },
      {
        model: require("../users/user.model").User,
        as: "collector",
        attributes: ["id", "name", "accountNumber", "contactNumber"],
      },
    ],
    order: [["confirmationDeadline", "ASC"]],
  });
}

async function listMine(user) {
  const where =
    user.role === "CLIENT"
      ? { clientId: user.id }
      : user.role === "COLLECTOR"
        ? { collectorId: user.id }
        : {};

  return Transaction.findAll({
    where,
    include: [
      {
        model: TransactionItem,
        as: "items",
        include: [{ model: Material, as: "material", attributes: ["name"] }],
      },
    ],
    order: [["createdAt", "DESC"]],
    limit: 200,
  });
}

module.exports = {
  submitWeights,
  addPhoto,
  confirm,
  listPending,
  listMine,
  getFullById,
  findByOrder,
};







