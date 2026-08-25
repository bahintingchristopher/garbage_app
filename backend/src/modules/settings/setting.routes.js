const express = require("express");
const controller = require("./setting.controller");
const requireAuth = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");

const router = express.Router();

router.use(requireAuth);

router.get("/payment", controller.getPayment);
router.put("/payment", requireRole("ADMIN"), controller.updatePayment);

module.exports = router;
