const ApiError = require("../../utils/ApiError");
const Setting = require("./setting.model");
const { systemFeePercent: defaultFee } = require("../../config/environment");

const PAYMENT_KEYS = ["gcashNumber", "bankAccountName", "bankAccountNumber"];

function sanitizeGcash(value) {
  const v = String(value ?? "").trim();
  if (v && !/^[0-9+\-\s]{7,20}$/.test(v)) {
    throw new ApiError(400, "gcashNumber must be a valid phone number");
  }
  return v;
}

function sanitizeText(value, max = 100) {
  return String(value ?? "").trim().slice(0, max);
}

function sanitizePercent(value, fallback) {
  const n = Number(value);
  if (isNaN(n) || n < 0 || n > 100) return fallback;
  return n;
}

async function getSystemFee() {
  const row = await Setting.findOne({ where: { key: "systemFeePercent" } });
  if (row) return Number(row.value);
  return defaultFee;
}

async function updateSystemFee(adminId, percent) {
  const value = String(sanitizePercent(percent, 12));
  await Setting.upsert({ key: "systemFeePercent", value, updatedBy: adminId });
  return { systemFeePercent: Number(value) };
}

async function getPaymentSettings() {
  const rows = await Setting.findAll({ where: { key: PAYMENT_KEYS } });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    gcashNumber: map.gcashNumber || "",
    bankAccountName: map.bankAccountName || "",
    bankAccountNumber: map.bankAccountNumber || "",
  };
}

async function updatePaymentSettings(adminId, patch) {
  const updates = {};
  if (patch.gcashNumber !== undefined) {
    updates.gcashNumber = sanitizeGcash(patch.gcashNumber);
  }
  if (patch.bankAccountName !== undefined) {
    updates.bankAccountName = sanitizeText(patch.bankAccountName);
  }
  if (patch.bankAccountNumber !== undefined) {
    updates.bankAccountNumber = sanitizeText(patch.bankAccountNumber);
  }

  for (const [key, value] of Object.entries(updates)) {
    await Setting.upsert({ key, value, updatedBy: adminId });
  }

  return getPaymentSettings();
}

module.exports = { getPaymentSettings, updatePaymentSettings, getSystemFee, updateSystemFee };
