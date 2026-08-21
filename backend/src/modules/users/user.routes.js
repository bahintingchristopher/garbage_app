const express = require("express");
const asyncHandler = require("../../utils/asyncHandler");
const requireAuth = require("../../middleware/auth.middleware");
const userService = require("./user.service");
const { formatUser } = require("./user.view");
const ApiError = require("../../utils/ApiError");

const router = express.Router();

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
