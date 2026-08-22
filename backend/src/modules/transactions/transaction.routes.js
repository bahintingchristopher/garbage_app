const express = require("express");
const controller = require("./transaction.controller");
const upload = require("../../config/upload");
const requireAuth = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");

const router = express.Router();

router.use(requireAuth);

router.get("/my", controller.myTransactions);
router.get("/order/:orderId", controller.getByOrder);
router.get("/:id", controller.getTransaction);
router.post(
  "/:id/photo",
  requireRole("COLLECTOR"),
  upload.single("photo"),
  controller.addPhoto
);
router.post("/:id/confirm", requireRole("CLIENT"), controller.confirm);

module.exports = router;