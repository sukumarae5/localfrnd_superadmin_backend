// src/modules/users/users.routes.js
const express = require("express");
const controller = require("./users.controller");
const validate = require("../../middleware/validation.middleware");
const { authenticate, requireRole } = require("../../middleware/auth.middleware");
const { ADMIN_ROLES } = require("../../constants");
const {
  createUserSchema,
  updateUserSchema,
  updateStatusSchema,
  updateVerificationSchema,
  addNoteSchema,
  listUsersQuerySchema,
} = require("./users.validation");

const router = express.Router();

// Every route in this module requires a logged-in admin
router.use(authenticate);

// GET /api/users?page=1&limit=20&search=&status=&verificationStatus=&onlineOnly=&sortBy=&sortOrder=
router.get("/", validate(listUsersQuerySchema, "query"), controller.list);

// GET /api/users/:id
router.get("/:id", controller.getOne);

// POST /api/users — admin-created user (e.g. support-created accounts)
router.post(
  "/",
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  validate(createUserSchema),
  controller.create
);

// PUT /api/users/:id — update profile fields
router.put(
  "/:id",
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  validate(updateUserSchema),
  controller.update
);

// PATCH /api/users/:id/status — activate/suspend/block, logs to user_status_history
router.patch(
  "/:id/status",
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  validate(updateStatusSchema),
  controller.updateStatus
);

// DELETE /api/users/:id — soft delete (sets deletedAt), super_admin only
router.delete("/:id", requireRole(ADMIN_ROLES.SUPER_ADMIN), controller.remove);

// Admin notes on a user (maps to your existing AdminNote model)
router.get("/:id/notes", controller.listNotes);
router.post("/:id/notes", validate(addNoteSchema), controller.addNote);

module.exports = router;