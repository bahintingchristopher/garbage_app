const express = require("express");
const controller = require("./collector.controller");
const requireAuth = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");

const router = express.Router();

router.use(requireAuth);

router.patch("/location", requireRole("COLLECTOR"), controller.updateLocation);
router.patch("/client-location", requireRole("CLIENT"), controller.updateClientLocation);
router.get("/locations", controller.listLocations);
router.get("/client-locations", requireRole("COLLECTOR"), controller.listClientLocations);
router.get("/:collectorId/location", controller.getLocation);

module.exports = router;
