const express = require("express");
const controller = require("./support.controller");
const requireAuth = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");

const router = express.Router();

router.use(requireAuth);

router.post("/", controller.create);
router.get("/my", controller.myTickets);
router.get("/", requireRole("ADMIN"), controller.adminList);
router.get("/:id", controller.getTicket);
router.post("/:id/messages", controller.addMessage);
router.post("/:id/resolve", requireRole("ADMIN"), controller.resolve);

module.exports = router;
