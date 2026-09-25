const express = require("express");
const router = express.Router();

const controller = require("./userAuth.controller");
const validate = require("../../middleware/validation.middleware");
const { sendOtpSchema, verifyOtpSchema, logoutSchema } = require("./userAuth.validation");
const { authenticateUser } = require("../../middleware/Userauth.middleware");

// POST /api/user/auth/send-otp
router.post("/send-otp", validate(sendOtpSchema), controller.sendOtp);

// POST /api/user/auth/verify-otp
router.post("/verify-otp", validate(verifyOtpSchema), controller.verifyOtp);

// POST /api/user/auth/logout
router.post("/logout", authenticateUser, validate(logoutSchema), controller.logout);

module.exports = router;