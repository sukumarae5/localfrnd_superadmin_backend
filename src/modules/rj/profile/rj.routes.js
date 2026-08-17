// src/modules/rj/profile/rj.routes.js
const express = require("express");
const controller = require("./rj.controller");
const validate = require("../../../middleware/validation.middleware");
const { authenticate, requireRole } = require("../../../middleware/auth.middleware");
const { ADMIN_ROLES } = require("../../../constants");
const {
  updateRJSchema,
  updateAccountStatusSchema,
  updatePresenceStatusSchema,
  addNoteSchema,
  listRJsQuerySchema,
} = require("./rj.validation");

const router = express.Router();

router.use(authenticate);

// GET /api/rj?page=&limit=&search=&status=&verificationStatus=&tier=&categoryId=&onlineOnly=&sortBy=&sortOrder=
router.get("/", validate(listRJsQuerySchema, "query"), controller.list);

// GET /api/rj/:id
router.get("/:id", controller.getOne);

// PUT /api/rj/:id — update profile fields (bio, categoryIds, commissionRate, tier...)
router.put(
  "/:id",
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  validate(updateRJSchema),
  controller.update
);

// PATCH /api/rj/:id/account-status — active/suspend/block (moderation, mandatory reason)
router.patch(
  "/:id/account-status",
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  validate(updateAccountStatusSchema),
  controller.updateAccountStatus
);

// PATCH /api/rj/:id/presence-status — online/offline/busy/on_call (admin override)
router.patch(
  "/:id/presence-status",
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  validate(updatePresenceStatusSchema),
  controller.updatePresenceStatus
);

// DELETE /api/rj/:id — soft delete, super_admin only
router.delete("/:id", requireRole(ADMIN_ROLES.SUPER_ADMIN), controller.remove);

// Admin notes on an RJ (RJAdminNote model)
router.get("/:id/notes", controller.listNotes);
router.post("/:id/notes", validate(addNoteSchema), controller.addNote);

module.exports = router;