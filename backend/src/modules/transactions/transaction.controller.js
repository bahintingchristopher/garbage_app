const asyncHandler = require("../../utils/asyncHandler");
const transactionService = require("./transaction.service");
const orderService = require("../orders/order.service");
const {
  formatTransaction,
  formatTransactionList,
} = require("./transaction.view");

exports.submitWeights = asyncHandler(async (req, res) => {
  const tx = await transactionService.submitWeights(
    req.params.id,
    req.user.id,
    req.body.items
  );
  res.status(201).json({
    success: true,
    message:
      "Transaction created. Waiting for client confirmation (auto-completes in 1 hour).",
    data: formatTransaction(tx),
  });
});

exports.addPhoto = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ success: false, message: "Attach an image in the 'photo' field" });
  }
  const filePath = `/uploads/${req.file.filename}`;
  const tx = await transactionService.addPhoto(
    req.params.id,
    req.user.id,
    filePath
  );
  res.json({
    success: true,
    message: "Photo uploaded",
    data: formatTransaction(tx),
  });
});

exports.confirm = asyncHandler(async (req, res) => {
  const tx = await transactionService.confirm(req.params.id, req.user.id);
  res.json({
    success: true,
    message: "Transaction confirmed. Thank you!",
    data: formatTransaction(tx),
  });
});

exports.dispute = asyncHandler(async (req, res) => {
  const tx = await transactionService.dispute(req.params.id, req.user.id);
  res.json({
    success: true,
    message: "Dispute filed. Our admin team will review it.",
    data: formatTransaction(tx),
  });
});

exports.listDisputed = asyncHandler(async (req, res) => {
  const rows = await transactionService.listDisputed();
  res.json({ success: true, data: rows });
});

exports.resolve = asyncHandler(async (req, res) => {
  const tx = await transactionService.resolve(
    req.params.id,
    req.user.id,
    String(req.body.outcome || "").toUpperCase()
  );
  res.json({ success: true, message: "Dispute resolved", data: tx });
});
exports.myTransactions = asyncHandler(async (req, res) => {
  const transactions = await transactionService.listMine(req.user);
  res.json({ success: true, data: formatTransactionList(transactions) });
});

exports.getByOrder = asyncHandler(async (req, res) => {
  const tx = await transactionService.findByOrder(req.params.orderId, req.user);
  res.json({ success: true, data: formatTransaction(tx) });
});

exports.getTransaction = asyncHandler(async (req, res) => {
  const tx = await transactionService.getFullById(req.params.id);
  const isOwner =
    Number(tx.clientId) === Number(req.user.id) ||
    Number(tx.collectorId) === Number(req.user.id);
  if (!isOwner && req.user.role !== "ADMIN") {
    return res.status(403).json({
      success: false,
      message: "You do not have access to this transaction",
    });
  }
  res.json({ success: true, data: formatTransaction(tx) });
});



