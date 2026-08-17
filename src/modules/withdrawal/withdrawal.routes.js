const express = require("express");
const controller = require("./withdrawal.controller");
const validate = require("../../middleware/validation.middleware");
const { authenticate, requireRole } = require("../../middleware/auth.middleware");
const { authenticateRJ } = require("../../middleware/rjAuth.middleware");
const { ADMIN_ROLES } = require("../../constants");
const {
  listWithdrawalsQuerySchema,
  rejectSchema,
  bulkIdsSchema,
  bulkRejectSchema,
  createWithdrawalSchema,
  listMyWithdrawalsQuerySchema,
  appealSchema,
} = require("./withdrawal.validation");

const router = express.Router();

// ---- RJ-facing (mobile app) — RJ-scoped auth, not admin auth ----
// Mirrors the rj/status.routes.js pattern: authenticateRJ applied per-route,
// ahead of the router.use(authenticate) that guards everything below it.
// Registered first so "/mine" is matched before the "/:id" param route below.

// POST /api/withdrawals/mine — RJ submits a new withdrawal request
router.post("/mine", authenticateRJ, validate(createWithdrawalSchema), controller.create);

// GET /api/withdrawals/mine?status=&page=&limit= — RJ's own withdrawal history
router.get("/mine", authenticateRJ, validate(listMyWithdrawalsQuerySchema, "query"), controller.listMine);

// GET /api/withdrawals/mine/:id — accepts publicId or displayCode, scoped to this RJ
router.get("/mine/:id", authenticateRJ, controller.getMine);

// POST /api/withdrawals/mine/:id/appeal — only valid on a rejected request
router.post("/mine/:id/appeal", authenticateRJ, validate(appealSchema), controller.raiseAppeal);

// ---- Admin-facing — everything below requires admin auth ----
router.use(authenticate);

// GET /api/withdrawals?status=pending|approved|rejected&page=&limit=&search=&category=&kycStatus=
router.get("/", validate(listWithdrawalsQuerySchema, "query"), controller.list);

// GET /api/withdrawals/:id  — accepts publicId (uuid) OR displayCode (WD-100001)
router.get("/:id", controller.getOne);

router.patch(
  "/:id/approve",
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  controller.approve
);
router.patch(
  "/:id/reject",
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  validate(rejectSchema),
  controller.reject
);

router.post(
  "/bulk-approve",
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  validate(bulkIdsSchema),
  controller.bulkApprove
);
router.post(
  "/bulk-reject",
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  validate(bulkRejectSchema),
  controller.bulkReject
);

// Appeals only apply to rejected requests
router.post(
  "/:id/appeal/dismiss",
  requireRole(ADMIN_ROLES.SUPER_ADMIN),
  controller.dismissAppeal
);
router.post(
  "/:id/appeal/approve-overrule",
  requireRole(ADMIN_ROLES.SUPER_ADMIN),
  controller.approveOverrule
);

module.exports = router;