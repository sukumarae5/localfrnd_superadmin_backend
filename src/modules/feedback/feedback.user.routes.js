// src/modules/feedback/feedback.user.routes.js
// Mounted at /api/user/feedback — the real mobile-app submission endpoint,
// kept separate from feedback.routes.js (mounted at /api/feedback, admin
// POST / is for testing/seeding only) so the two never collide on the same
// path. Matches this codebase's dominant pattern of a separate /user/*
// prefix for the genuine mobile-facing counterpart of an admin module
// (userProfile vs users, userCoin vs coinTransaction, userAvatar vs avatar).
const express = require("express");
const router = express.Router();

const controller = require("./feedback.controller");
const validate = require("../../middleware/validation.middleware");
const { authenticateUser } = require("../../middleware/Userauth.middleware");
const { createMyFeedbackSchema } = require("./feedback.validation");

router.use(authenticateUser);

// POST /api/user/feedback — userId always taken from the token, never the body
router.post("/", validate(createMyFeedbackSchema), controller.createMine);

module.exports = router;