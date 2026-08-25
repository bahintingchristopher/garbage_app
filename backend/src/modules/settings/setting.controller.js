const settingService = require("./setting.service");
const asyncHandler = require("../../utils/asyncHandler");

exports.getPayment = asyncHandler(async (req, res) => {
  const data = await settingService.getPaymentSettings();
  res.json({ success: true, data });
});

exports.updatePayment = asyncHandler(async (req, res) => {
  const data = await settingService.updatePaymentSettings(
    req.user.id,
    req.body || {}
  );
  res.json({ success: true, message: "Payment settings saved", data });
});
