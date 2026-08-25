const express = require("express");

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Garbage Collection App API",
    version: "1.0",
    endpoints: {
      health: "GET /api/health",
      register: "POST /api/auth/register",
      login: "POST /api/auth/login",
      me: "GET /api/auth/me (needs Bearer token)",
      userProfile: "GET /api/users/me (needs Bearer token)",
    },
  });
});

router.get("/health", (req, res) => {
  res.json({ success: true, message: "Garbage app API is running" });
});

router.use("/auth", require("../modules/auth/auth.routes"));
router.use("/users", require("../modules/users/user.routes"));
router.use("/materials", require("../modules/materials/material.routes"));
router.use("/vehicles", require("../modules/vehicles/vehicle.routes"));
router.use("/orders", require("../modules/orders/order.routes"));
router.use("/transactions", require("../modules/transactions/transaction.routes"));
router.use("/wallet", require("../modules/wallet/wallet.routes"));
router.use("/topups", require("../modules/wallet/topup.routes"));
router.use("/announcements", require("../modules/announcements/announcement.routes"));
router.use("/feedback", require("../modules/feedback/feedback.routes"));
router.use("/support", require("../modules/support/support.routes"));
router.use("/stats", require("../modules/statistics/statistics.routes"));
router.use("/conversations", require("../modules/chat/chat.routes"));
router.use("/collectors", require("../modules/collectors/collector.routes"));
router.use("/settings", require("../modules/settings/setting.routes"));

// Admin helper: force-run the auto-complete sweep (useful for demos/tests)
router.post(
  "/admin/run-auto-complete",
  require("../middleware/auth.middleware"),
  require("./../middleware/role.middleware").requireRole("ADMIN"),
  async (req, res, next) => {
    try {
      const { runAutoComplete } = require("../jobs/autoComplete.job");
      const count = await runAutoComplete();
      res.json({ success: true, message: `Auto-completed ${count} transaction(s)` });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;







