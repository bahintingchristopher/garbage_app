const { Op } = require("sequelize");
const { Order } = require("../orders/order.model");

const ACTIVE_STATUSES = ["ACCEPTED", "ON_THE_WAY", "ARRIVED", "COLLECTING"];

/**
 * Returns [{ collectorId, clientId }] for all active orders that have
 * an assigned collector — used to know who should track whom.
 */
async function getActiveTrackingPairs() {
  const orders = await Order.findAll({
    where: {
      status: { [Op.in]: ACTIVE_STATUSES },
      collectorId: { [Op.ne]: null },
    },
    attributes: ["collectorId", "clientId"],
    raw: true,
  });
  return orders;
}

/**
 * Client IDs that have at least one active order with this collector.
 */
async function getClientIdsForCollector(collectorId) {
  const orders = await Order.findAll({
    where: {
      status: { [Op.in]: ACTIVE_STATUSES },
      collectorId,
    },
    attributes: ["clientId"],
    raw: true,
  });
  return [...new Set(orders.map((o) => Number(o.clientId)))];
}

/**
 * Collector IDs that have at least one active order with this client.
 */
async function getCollectorIdsForClient(clientId) {
  const orders = await Order.findAll({
    where: {
      status: { [Op.in]: ACTIVE_STATUSES },
      clientId,
    },
    attributes: ["collectorId"],
    raw: true,
  });
  return [...new Set(orders.map((o) => Number(o.collectorId)))];
}

module.exports = {
  getActiveTrackingPairs,
  getClientIdsForCollector,
  getCollectorIdsForClient,
  ACTIVE_STATUSES,
};
