const express = require("express");

const controller = require("./paymentWebhook.controller");
const { verifyRazorpayWebhookSignature } = require("../../middleware/razorpayWebhookSignature.middleware");

const router = express.Router();

// No authenticate/requireRole here -- this is a server-to-server callback
// from Razorpay, not an admin or user request. The signature check IS
// the authentication.
router.post("/razorpay", verifyRazorpayWebhookSignature, controller.razorpay);

module.exports = router;
