const express = require("express");
const asyncHandler = require("../../utils/asyncHandler");
const requireAuth = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");
const userService = require("./user.service");
const { formatUser } = require("./user.view");
const ApiError = require("../../utils/ApiError");

const router = express.Router();

router.get(
  "/collectors",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const rows = await userService.listCollectors();
    res.json({
      success: true,
      data: rows.map((u) => ({
        id: u.id,
        name: u.name,
        accountNumber: u.accountNumber,
        contactNumber: u.contactNumber,
        address: u.address,
        ecoinBalance: Number(u.Wallet ? u.Wallet.balance : 0),
      })),
    });
  })
);

router.get(
  "/clients",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const rows = await userService.listClients();
    res.json({
      success: true,
      data: rows.map((u) => ({
        id: u.id,
        name: u.name,
        address: u.address,
        contactNumber: u.contactNumber,
      })),
    });
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await userService.findActiveById(req.user.id);
    if (!user) throw new ApiError(404, "Account not found");
    res.json({ success: true, data: formatUser(user) });
  })
);

module.exports = router;
