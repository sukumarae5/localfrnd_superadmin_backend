const express = require("express");
const controller = require("./activity.controller");
const validate = require("../../middleware/validation.middleware");
const { authenticate, requireRole } = require("../../middleware/auth.middleware");
const { ADMIN_ROLES } = require("../../constants");
const { listLogsQuerySchema, listSessionsQuerySchema, feedQuerySchema } = require("./activity.validation");

const router = express.Router();
router.use(authenticate);

router.get("/stats", controller.stats);
router.get("/feed", validate(feedQuerySchema, "query"), controller.feed);
router.get("/logs", validate(listLogsQuerySchema, "query"), controller.logs);
router.get("/sessions", validate(listSessionsQuerySchema, "query"), controller.sessions);

// Force-logout a device — backs the "Investigate Session" alert action
router.patch("/sessions/:id/end", requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN), controller.endSession);

module.exports = router;