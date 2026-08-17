// src/modules/rj/status/status.routes.js
const express = require("express");
const controller = require("./status.controller");
const validate = require("../../../middleware/validation.middleware");
const { authenticate, requireRole } = require("../../../middleware/auth.middleware");
const { authenticateRJ } = require("../../../middleware/rjAuth.middleware");
const { ADMIN_ROLES } = require("../../../constants");
const {
  listOnlineQuerySchema,
  listOfflineQuerySchema,
  heartbeatSchema,
  goOfflineSchema,
  sendNotificationSchema,
} = require("./status.validation");

const router = express.Router();

// Called by the RJ mobile app itself — RJ-scoped auth, not admin auth.
router.patch("/:id/heartbeat", authenticateRJ, validate(heartbeatSchema), controller.heartbeat);
router.patch("/:id/offline", authenticateRJ, validate(goOfflineSchema), controller.goOffline);

router.use(authenticate);

router.get("/online", validate(listOnlineQuerySchema, "query"), controller.listOnline);
router.get("/offline", validate(listOfflineQuerySchema, "query"), controller.listOffline);
router.get("/live-activity", controller.liveActivity);
router.get("/:id/call-monitoring", controller.callMonitoring);
router.patch("/calls/:callId/end", requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN), controller.endCall);
router.post(
  "/notify",
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  validate(sendNotificationSchema),
  controller.sendNotification
);

module.exports = router;