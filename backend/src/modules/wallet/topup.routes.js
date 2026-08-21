const express = require("express");
const controller = require("./topup.controller");
const requireAuth = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");

const router = express.Router();

router.use(requireAuth);

router.post("/", requireRole("COLLECTOR"), controller.request);
router.get("/my", requireRole("COLLECTOR"), controller.myTopUps);
router.get("/", requireRole("ADMIN"), controller.adminList);
router.post("/:id/approve", requireRole("ADMIN"), controller.approve);
router.post("/:id/reject", requireRole("ADMIN"), controller.reject);

module.exports = router;
