const { Op } = require("sequelize");
const sequelize = require("../../config/database");
const ApiError = require("../../utils/ApiError");
const { TopUp, PAYMENT_METHODS } = require("./topup.model");
const walletService = require("./wallet.service");

async function requestTopUp(collectorId, { amount, paymentMethod, referenceNumber }) {
  if (!amount || Number(amount) <= 0) {
    throw new ApiError(400, "amount must be a positive number");
  }
  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    throw new ApiError(400, `paymentMethod must be one of: ${PAYMENT_METHODS.join(", ")}`);
  }
  if (!referenceNumber || !String(referenceNumber).trim()) {
    throw new ApiError(400, "referenceNumber is required (from your GCash/bank receipt)");
  }

  const duplicate = await TopUp.findOne({
    where: { referenceNumber: String(referenceNumber).trim() },
  });
  if (duplicate) {
    throw new ApiError(409, "This reference number was already submitted");
  }

  return TopUp.create({
    collectorId,
    amount: Number(amount),
    paymentMethod,
    referenceNumber: String(referenceNumber).trim(),
  });
}

async function listMine(collectorId) {
  return TopUp.findAll({
    where: { collectorId },
    order: [["createdAt", "DESC"]],
  });
}

async function adminList(status) {
  const where = status ? { status } : {};
  return TopUp.findAll({ where, order: [["createdAt", "DESC"]], limit: 200 });
}

async function getById(id) {
  const topUp = await TopUp.findByPk(id);
  if (!topUp) throw new ApiError(404, "Top-up request not found");
  return topUp;
}

async function approve(topUpId, adminId) {
  return sequelize.transaction(async (t) => {
    // Lock the row so two admins cannot approve simultaneously.
    const topUp = await TopUp.findByPk(topUpId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!topUp) throw new ApiError(404, "Top-up request not found");
    if (topUp.status !== "PENDING") {
      throw new ApiError(400, `Top-up is already ${topUp.status}`);
    }

    topUp.status = "APPROVED";
    topUp.reviewedBy = adminId;
    topUp.reviewedAt = new Date();
    await topUp.save({ transaction: t });

    await walletService.applyChange(
      topUp.collectorId,
      Number(topUp.amount),
      "TOP_UP",
      `topup-${topUp.id}`,
      `${topUp.paymentMethod} top-up ref ${topUp.referenceNumber}`,
      t
    );

    return topUp;
  });
}

async function reject(topUpId, adminId, reason) {
  const topUp = await getById(topUpId);
  if (topUp.status !== "PENDING") {
    throw new ApiError(400, `Top-up is already ${topUp.status}`);
  }
  topUp.status = "REJECTED";
  topUp.reviewedBy = adminId;
  topUp.reviewedAt = new Date();
  topUp.rejectionReason = reason ? String(reason).trim() : null;
  await topUp.save();
  return topUp;
}

module.exports = { requestTopUp, listMine, adminList, approve, reject };
