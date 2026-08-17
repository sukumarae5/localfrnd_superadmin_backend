// src/modules/auth/auth.routes.js
const express = require("express");
const controller = require("./auth.controller");
const validate = require("../../middleware/validation.middleware");
const rateLimit = require("../../middleware/rateLimiter.middleware");
const { authenticate } = require("../../middleware/auth.middleware");
const { loginSchema } = require("./auth.validation");

const router = express.Router();

// Max 8 login attempts per IP per 60s, on top of the per-account DB lockout
const loginRateLimiter = rateLimit({ windowSeconds: 60, maxRequests: 8, keyPrefix: "rl:login" });

router.post("/login", loginRateLimiter, validate(loginSchema), controller.login);
router.post("/refresh", controller.refresh);
router.post("/logout", controller.logout);
router.get("/me", authenticate, controller.me);

module.exports = router;