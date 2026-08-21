const { Op } = require("sequelize");
const sequelize = require("../../config/database");
const ApiError = require("../../utils/ApiError");
const { User, ClientProfile, CollectorProfile, Wallet } = require("../users/user.model");
const { Order, OrderItem, TIME_SLOTS } = require("./order.model");
const Material = require("../materials/material.model");

/// Legal status transitions (state machine).
const TRANSITIONS = {
  ACCEPTED: ["BOOKED"],
  ON_THE_WAY: ["ACCEPTED"],
  ARRIVED: ["ON_THE_WAY"],
  COLLECTING: ["ARRIVED"],
};

const CLIENT_CANCELLABLE = ["BOOKED", "ACCEPTED"];

function parseDate(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    throw new ApiError(400, "scheduledDate must be in YYYY-MM-DD format");
  }
  const date = new Date(`${value}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, "scheduledDate is not a valid date");
  }
  if (date < today) {
    throw new ApiError(400, "scheduledDate cannot be in the past");
  }
  return value;
}

/// Active pickups that have coordinates: unclaimed BOOKED ones plus my own jobs.
async function listActiveLocations(collectorId) {
  return Order.findAll({
    where: {
      status: { [Op.in]: ["BOOKED", "ACCEPTED", "ON_THE_WAY", "ARRIVED", "COLLECTING"] },
      latitude: { [Op.ne]: null },
      [Op.or]: [{ collectorId: null }, { collectorId }],
    },
    include: [
      {
        model: require("../users/user.model").User,
        as: "client",
        attributes: ["id", "name", "contactNumber"],
      },
      {
        model: OrderItem,
        as: "declaredItems",
        include: [{ model: Material, as: "material", attributes: ["name"] }],
      },
    ],
    order: [["createdAt", "DESC"]],
  });
}

async function book(clientId, { pickupAddress, latitude, longitude, scheduledDate, timeSlot, notes, items }) {
  if (!pickupAddress || !String(pickupAddress).trim()) {
    throw new ApiError(400, "pickupAddress is required");
  }
  const validDate = parseDate(scheduledDate);
  if (timeSlot && !TIME_SLOTS.includes(timeSlot)) {
    throw new ApiError(400, `timeSlot must be one of: ${TIME_SLOTS.join(", ")}`);
  }

  // Optional declared materials: [{ materialId, estimatedKg }]
  let itemRows = [];
  if (items != null) {
    if (!Array.isArray(items) || items.length === 0 || items.length > 10) {
      throw new ApiError(400, "items must be an array of 1 to 10 entries");
    }
    const merged = new Map();
    for (const it of items) {
      const materialId = Number(it && it.materialId);
      const kg = Number(it && it.estimatedKg);
      if (!Number.isInteger(materialId)) {
        throw new ApiError(400, "Each item needs a valid materialId");
      }
      if (!kg || kg <= 0) {
        throw new ApiError(400, "estimatedKg must be above 0");
      }
      merged.set(materialId, (merged.get(materialId) || 0) + kg);
    }
    const materials = await Material.findAll({ where: { id: [...merged.keys()] } });
    if (materials.length !== merged.size) {
      throw new ApiError(400, "One or more materials do not exist");
    }
    itemRows = [...merged.entries()].map(([mid, kg]) => ({
      materialId: mid,
      estimatedKg: Math.round(kg * 100) / 100,
    }));
  }

  return sequelize.transaction(async (t) => {
    const order = await Order.create(
      {
        clientId,
        pickupAddress: String(pickupAddress).trim(),
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        scheduledDate: validDate,
        timeSlot: timeSlot || "MORNING",
        notes: notes ? String(notes).trim() : null,
      },
      { transaction: t }
    );
    if (itemRows.length > 0) {
      await OrderItem.bulkCreate(
        itemRows.map((r) => ({ ...r, orderId: order.id })),
        { transaction: t }
      );
    }
    return order;
  });
}

const INCLUDE_FULL = [
  {
    model: User,
    as: "client",
    attributes: ["id", "name", "contactNumber", "accountNumber"],
    include: [{ model: ClientProfile, attributes: ["rating"] }],
  },
  {
    model: User,
    as: "collector",
    attributes: ["id", "name", "contactNumber", "accountNumber"],
    include: [
      { model: CollectorProfile, attributes: ["rating"] },
      { model: Wallet, attributes: ["balance"] },
    ],
  },
];

async function getFullById(id) {
  const order = await Order.findByPk(id, { include: INCLUDE_FULL });
  if (!order) throw new ApiError(404, "Order not found");
  return order;
}

async function listForClient(clientId) {
  return Order.findAll({
    where: { clientId },
    include: INCLUDE_FULL,
    order: [["createdAt", "DESC"]],
  });
}

async function listForCollector(collectorId) {
  return Order.findAll({
    where: { collectorId },
    include: INCLUDE_FULL,
    order: [["createdAt", "DESC"]],
  });
}

async function listAvailable() {
  return Order.findAll({
    where: { status: "BOOKED", collectorId: null },
    include: INCLUDE_FULL,
    order: [["scheduledDate", "ASC"]],
  });
}

async function claim(orderId, collectorId) {
  return sequelize.transaction(async (t) => {
    // Atomic claim: only succeeds if the order is still unclaimed.
    const [updatedRows] = await Order.update(
      {
        collectorId,
        status: "ACCEPTED",
        acceptedAt: new Date(),
      },
      {
        where: {
          id: orderId,
          status: "BOOKED",
          collectorId: null,
        },
        transaction: t,
      }
    );

    if (updatedRows === 0) {
      throw new ApiError(
        409,
        "Order is no longer available (already claimed or cancelled)"
      );
    }

    // Read within the same transaction so the response reflects the claim
    return Order.findByPk(orderId, { include: INCLUDE_FULL, transaction: t });
  });
}

async function advanceStatus(orderId, collectorId, nextStatus) {
  const allowedFrom = TRANSITIONS[nextStatus];
  if (!allowedFrom) {
    throw new ApiError(400, `Cannot move an order to ${nextStatus} directly`);
  }

  const [updatedRows] = await Order.update(
    { status: nextStatus },
    {
      where: {
        id: orderId,
        collectorId,
        status: { [Op.in]: allowedFrom },
      },
    }
  );

  if (updatedRows === 0) {
    const order = await Order.findByPk(orderId);
    if (!order) throw new ApiError(404, "Order not found");
    if (Number(order.collectorId) !== Number(collectorId)) {
      throw new ApiError(403, "This order is assigned to another collector");
    }
    throw new ApiError(
      400,
      `Illegal transition: ${order.status} -> ${nextStatus}`
    );
  }

  return getFullById(orderId);
}

async function cancelByClient(orderId, clientId) {
  const [updatedRows] = await Order.update(
    { status: "CANCELLED" },
    {
      where: {
        id: orderId,
        clientId,
        status: { [Op.in]: CLIENT_CANCELLABLE },
      },
    }
  );

  if (updatedRows === 0) {
    const order = await Order.findByPk(orderId);
    if (!order) throw new ApiError(404, "Order not found");
    if (Number(order.clientId) !== Number(clientId)) {
      throw new ApiError(403, "You can only cancel your own bookings");
    }
    throw new ApiError(
      400,
      `Order can no longer be cancelled while ${order.status}`
    );
  }

  return getFullById(orderId);
}

module.exports = {
  listActiveLocations,
  book,
  getFullById,
  listForClient,
  listForCollector,
  listAvailable,
  claim,
  advanceStatus,
  cancelByClient,
};





