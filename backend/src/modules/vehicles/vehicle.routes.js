const express = require("express");
const controller = require("./vehicle.controller");
const requireAuth = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");

const router = express.Router();

router.use(requireAuth, requireRole("COLLECTOR"));

router.get("/my", controller.listMyVehicles);
router.post("/", controller.createVehicle);
router.patch("/:id", controller.updateVehicle);
router.delete("/:id", controller.deleteVehicle);

module.exports = router;
