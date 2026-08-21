const { Op, fn, col } = require("sequelize");
const ApiError = require("../../utils/ApiError");
const Feedback = require("./feedback.model");
const { Transaction } = require("../transactions/transaction.model");
const { User } = require("../users/user.model");

const FINAL_STATUSES = ["CONFIRMED", "AUTO_COMPLETED"];

async function submit(senderId, { transactionId, rating, comment }) {
  const rate = Number(rating);
  if (!Number.isInteger(rate) || rate < 1 || rate > 5) {
    throw new ApiError(400, "rating must be an integer from 1 to 5");
  }

  const tx = await Transaction.findByPk(transactionId);
  if (!tx) throw new ApiError(404, "Transaction not found");

  const isClient = Number(tx.clientId) === Number(senderId);
  const isCollector = Number(tx.collectorId) === Number(senderId);
  if (!isClient && !isCollector) {
    throw new ApiError(403, "You are not part of this transaction");
  }
  if (!FINAL_STATUSES.includes(tx.confirmationStatus)) {
    throw new ApiError(
      400,
      `Feedback is only allowed after completion (current: ${tx.confirmationStatus})`
    );
  }

  const receiverId = isClient ? tx.collectorId : tx.clientId;

  const existing = await Feedback.findOne({
    where: { transactionId, senderId },
  });
  if (existing) {
    throw new ApiError(409, "You already rated this transaction");
  }

  return Feedback.create({
    transactionId,
    senderId,
    receiverId,
    rating: rate,
    comment: comment ? String(comment).trim() : null,
  });
}

async function listForTransaction(transactionId, userId, role) {
  const tx = await Transaction.findByPk(transactionId);
  if (!tx) throw new ApiError(404, "Transaction not found");
  const allowed =
    role === "ADMIN" ||
    Number(tx.clientId) === Number(userId) ||
    Number(tx.collectorId) === Number(userId);
  if (!allowed) throw new ApiError(403, "You do not have access to this transaction");

  return Feedback.findAll({
    where: { transactionId },
    include: [
      { model: User, as: "sender", attributes: ["id", "name"] },
      { model: User, as: "receiver", attributes: ["id", "name"] },
    ],
    order: [["createdAt", "DESC"]],
  });
}

/// Summary of what a user has received: average + count + recent comments.
async function summaryFor(receiverId) {
  const [agg] = await Feedback.findAll({
    where: { receiverId },
    attributes: [
      [fn("COUNT", col("id")), "count"],
      [fn("AVG", col("rating")), "average"],
    ],
    raw: true,
  });

  const recent = await Feedback.findAll({
    where: { receiverId },
    include: [{ model: User, as: "sender", attributes: ["id", "name"] }],
    order: [["createdAt", "DESC"]],
    limit: 10,
  });

  return {
    count: Number(agg ? agg.count : 0),
    average: agg && agg.average ? Math.round(Number(agg.average) * 10) / 10 : 0,
    recent,
  };
}

module.exports = { submit, listForTransaction, summaryFor };


