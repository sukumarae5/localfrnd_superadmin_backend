const express = require("express");
const router = express.Router();

const controller = require("./userAuth.controller");
const validate = require("../../middleware/validation.middleware");
const { sendOtpSchema, verifyOtpSchema } = require("./userAuth.validation");

// POST /api/user/auth/send-otp
router.post("/send-otp", validate(sendOtpSchema), controller.sendOtp);

// POST /api/user/auth/verify-otp
router.post("/verify-otp", validate(verifyOtpSchema), controller.verifyOtp);

module.exports = router;