const asyncHandler = require("../../utils/asyncHandler");
const walletService = require("./wallet.service");
const {
  formatWalletTransactionList,
} = require("./wallet.view");

exports.balance = asyncHandler(async (req, res) => {
  const balance = await walletService.getBalance(req.user.id);
  res.json({ success: true, data: { balance } });
});

exports.history = asyncHandler(async (req, res) => {
  const entries = await walletService.getHistory(req.user.id);
  res.json({
    success: true,
    data: formatWalletTransactionList(entries),
  });
});
