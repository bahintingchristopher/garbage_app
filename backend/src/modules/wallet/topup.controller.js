const asyncHandler = require("../../utils/asyncHandler");
const topupService = require("./topup.service");
const { formatTopUp, formatTopUpList } = require("./wallet.view");

exports.request = asyncHandler(async (req, res) => {
  const topUp = await topupService.requestTopUp(req.user.id, req.body);
  res.status(201).json({
    success: true,
    message: "Top-up submitted. An admin will verify your payment shortly.",
    data: formatTopUp(topUp),
  });
});

exports.myTopUps = asyncHandler(async (req, res) => {
  const topUps = await topupService.listMine(req.user.id);
  res.json({ success: true, data: formatTopUpList(topUps) });
});

exports.adminList = asyncHandler(async (req, res) => {
  const topUps = await topupService.adminList(req.query.status);
  res.json({ success: true, data: formatTopUpList(topUps) });
});

exports.approve = asyncHandler(async (req, res) => {
  const topUp = await topupService.approve(req.params.id, req.user.id);
  res.json({
    success: true,
    message: `Approved. ${topUp.paymentMethod} top-up of P${Number(topUp.amount)} credited.`,
    data: formatTopUp(topUp),
  });
});

exports.reject = asyncHandler(async (req, res) => {
  const topUp = await topupService.reject(
    req.params.id,
    req.user.id,
    req.body.reason
  );
  res.json({
    success: true,
    message: "Top-up rejected",
    data: formatTopUp(topUp),
  });
});
