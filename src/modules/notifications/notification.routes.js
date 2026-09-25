const express = require("express");
const controller = require("./notification.controller");
const validate = require("../../middleware/validation.middleware");
const { authenticateRJ } = require("../../middleware/rjAuth.middleware");
const { authenticateUser } = require("../../middleware/Userauth.middleware");
const { listQuerySchema } = require("./notifications.validation");

function mount(authMiddleware) {
  const router = express.Router();
  router.use(authMiddleware); // must run before the routes below, not after
  router.get("/", validate(listQuerySchema, "query"), controller.listNotifications);
  router.post("/read", controller.markAllRead);
  router.get("/unread-count", controller.unreadCount);
  return router;
}

// Mounted at /user/notifications
const userNotificationsRouter = mount(authenticateUser);

// Mounted at /rj/notifications
const rjNotificationsRouter = mount(authenticateRJ);

module.exports = { userNotificationsRouter, rjNotificationsRouter };