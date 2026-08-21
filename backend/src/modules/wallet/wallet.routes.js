const express = require("express");
const controller = require("./wallet.controller");
const requireAuth = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");

const router = express.Router();

router.use(requireAuth, requireRole("COLLECTOR"));

router.get("/balance", controller.balance);
router.get("/history", controller.history);

module.exports = router;
