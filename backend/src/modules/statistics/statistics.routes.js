const express = require("express");
const controller = require("./statistics.controller");
const requireAuth = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");

const router = express.Router();

router.use(requireAuth);

router.get("/me", controller.myStats);
router.get("/admin", requireRole("ADMIN"), controller.adminStats);

module.exports = router;
