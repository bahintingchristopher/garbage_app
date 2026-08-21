const express = require("express");
const controller = require("./order.controller");
const txController = require("../transactions/transaction.controller");
const requireAuth = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");

const router = express.Router();

router.use(requireAuth);

router.post("/", requireRole("CLIENT"), controller.book);
router.get("/my", controller.myOrders);
router.get("/available", requireRole("COLLECTOR"), controller.availableOrders);
router.get("/active-locations", requireRole("COLLECTOR"), controller.activeLocations);
router.get("/:id", controller.getOrder);
router.post("/:id/request", requireRole("COLLECTOR"), controller.claim);
router.patch("/:id/status", requireRole("COLLECTOR"), controller.advanceStatus);
router.post(
  "/:id/weights",
  requireRole("COLLECTOR"),
  txController.submitWeights
);
router.post("/:id/cancel", requireRole("CLIENT"), controller.cancel);

module.exports = router;



