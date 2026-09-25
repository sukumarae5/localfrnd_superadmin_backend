// src/modules/presence/presence.routes.js
const express = require("express");
const controller = require("./presence.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { authenticateUser } = require("../../middleware/Userauth.middleware");

const router = express.Router();

// Accepts either an admin token or an app-user token — an RJ's live status is
// something the calling app legitimately needs (e.g. "is this RJ available
// right now"), not just the admin dashboard. Reuses the two existing
// middlewares as-is; no new auth/JWT logic is introduced here.
function authenticateAdminOrUser(req, res, next) {
  authenticate(req, res, (err) => {
    if (!err) return next();
    authenticateUser(req, res, next);
  });
}

router.get("/rj/:id", authenticateAdminOrUser, controller.getRJPresence);

// A user's own presence is private — admin-only.
router.get("/user/:id", authenticate, controller.getUserPresence);

router.get("/rjs", authenticate, controller.listOnlineRJs);
router.get("/users", authenticate, controller.listOnlineUsers);

module.exports = router;