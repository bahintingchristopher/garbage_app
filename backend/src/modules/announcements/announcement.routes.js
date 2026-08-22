const express = require("express");
const controller = require("./announcement.controller");
const requireAuth = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");

const router = express.Router();

router.use(requireAuth);

router.get("/", controller.list);
router.post("/", requireRole("ADMIN"), controller.create);
router.get("/all", requireRole("ADMIN"), controller.adminList);
router.patch("/:id", requireRole("ADMIN"), controller.update);
router.delete("/:id", requireRole("ADMIN"), controller.remove);

module.exports = router;
