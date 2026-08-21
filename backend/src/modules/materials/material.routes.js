const express = require("express");
const controller = require("./material.controller");
const requireAuth = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");

const router = express.Router();

router.use(requireAuth);

router.get("/", controller.listMaterials);
router.get("/:id", controller.getMaterial);
router.post("/", requireRole("ADMIN"), controller.createMaterial);
router.patch("/:id", requireRole("ADMIN"), controller.updateMaterial);

module.exports = router;
