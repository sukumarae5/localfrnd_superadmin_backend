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

// Same caveat as before: real submission belongs on the user-facing API with
// user-JWT auth, not here. Wired admin-side only so you can test/seed data.
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