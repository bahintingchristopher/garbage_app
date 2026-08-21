const express = require("express");
const controller = require("./feedback.controller");
const requireAuth = require("../../middleware/auth.middleware");

const router = express.Router();

router.use(requireAuth);

router.post("/", controller.submit);
router.get("/my", controller.mySummary);
router.get("/transaction/:transactionId", controller.forTransaction);

module.exports = router;
