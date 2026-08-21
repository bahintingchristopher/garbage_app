const express = require("express");
const controller = require("./chat.controller");
const requireAuth = require("../../middleware/auth.middleware");

const router = express.Router();

router.use(requireAuth);

router.post("/", controller.startConversation);
router.get("/", controller.listConversations);
router.get("/:id/messages", controller.getMessages);
router.post("/:id/messages", controller.sendMessage);

module.exports = router;
