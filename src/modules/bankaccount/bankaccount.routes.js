const express = require("express");
const controller = require("./bankaccount.controller");
const validate = require("../../middleware/validation.middleware");
const { authenticate, requireRole } = require("../../middleware/auth.middleware");
const { authenticateRJ } = require("../../middleware/rjAuth.middleware");
const { ADMIN_ROLES } = require("../../constants");
const {
  listBankAccountsQuerySchema,
  approveSchema,
  rejectSchema,
  noteSchema,
  createMineSchema,
} = require("./bankaccount.validation");

const router = express.Router();

// ---- RJ-facing (mobile app) — RJ-scoped auth, not admin auth ----
// Mirrors withdrawal.routes.js's "/mine" pattern. Registered first so
// "/mine*" is matched before the admin-only "/:id" param routes below.

// POST /api/rj/bank-accounts/mine — RJ adds a bank account or UPI id (always starts "pending")
router.post("/mine", authenticateRJ, validate(createMineSchema), controller.createMine);

// GET /api/rj/bank-accounts/mine — RJ's own accounts
router.get("/mine", authenticateRJ, controller.listMine);

// GET /api/rj/bank-accounts/mine/:id — :id is publicId (uuid), scoped to this RJ
router.get("/mine/:id", authenticateRJ, controller.getOneMine);

// PATCH /api/rj/bank-accounts/mine/:id/set-primary — only among her own, only if verified
router.patch("/mine/:id/set-primary", authenticateRJ, controller.setPrimaryMine);

// DELETE /api/rj/bank-accounts/mine/:id — soft delete
router.delete("/mine/:id", authenticateRJ, controller.deleteMine);

// ---- Admin-facing — everything below requires admin auth ----
router.use(authenticate);

// GET /api/rj/bank-accounts?status=&search=&accountOrUpi=&bankName=&duplicatesOnly=
router.get("/", validate(listBankAccountsQuerySchema, "query"), controller.list);

// GET /api/rj/bank-accounts/:id  — :id is publicId (uuid)
router.get("/:id", controller.getOne);

router.patch(
  "/:id/approve",
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  validate(approveSchema),
  controller.approve
);
router.patch(
  "/:id/reject",
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  validate(rejectSchema),
  controller.reject
);
router.patch(
  "/:id/notes",
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  validate(noteSchema),
  controller.addNote
);
router.post(
  "/:id/penny-drop-retry",
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  controller.retryPennyDrop
);

module.exports = router;