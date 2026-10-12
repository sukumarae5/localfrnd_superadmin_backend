const express = require("express");
const controller = require("./feedback.controller");
const validate = require("../../middleware/validation.middleware");
const { authenticate, requireRole } = require("../../middleware/auth.middleware");
const { ADMIN_ROLES } = require("../../constants");
const {
  listFeedbackQuerySchema, createFeedbackSchema, updateStatusSchema, assignSchema, setPrioritySchema,
} = require("./feedback.validation");

const router = express.Router();
router.use(authenticate);

router.get("/", validate(listFeedbackQuerySchema, "query"), controller.list);
router.get("/:id", controller.getOne);

// Admin-only testing/seeding create. The REAL mobile-app submission is
// POST /api/user/feedback (feedback.user.routes.js, authenticateUser,
// userId taken from the token) — deliberately a different path so the two
// never collide.
router.post("/", validate(createFeedbackSchema), controller.create);

router.patch(
  "/:id/status",
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  validate(updateStatusSchema),
  controller.updateStatus
);
router.patch(
  "/:id/assign",
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  validate(assignSchema),
  controller.assign
);
router.patch(
  "/:id/priority",
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  validate(setPrioritySchema),
  controller.setPriority
);

module.exports = router;