// src/modules/moderation/moderation.routes.js
const express = require("express");
const controller = require("./moderation.controller");
const validate = require("../../middleware/validation.middleware");
const { authenticate, requireRole } = require("../../middleware/auth.middleware");
const { ADMIN_ROLES } = require("../../constants");
const {
  listQuerySchema,
  updateBlockSchema,
  unblockSchema,
  appealDecisionSchema,
} = require("./moderation.validation");

const router = express.Router();

router.use(authenticate);

// GET /api/moderation/blocked?page=&limit=&search=&blockType=&reason=&appealStatus=&dateFrom=&dateTo=
router.get("/blocked", validate(listQuerySchema, "query"), controller.list);

// GET /api/moderation/blocked/:userId
router.get("/blocked/:userId", controller.getOne);

// PATCH /api/moderation/blocked/:userId/block  { blockType?, expiresAt?, reason? }
router.patch(
  "/blocked/:userId/block",
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  validate(updateBlockSchema),
  controller.updateBlock
);

// PATCH /api/moderation/blocked/:userId/unblock  { reason? }
router.patch(
  "/blocked/:userId/unblock",
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  validate(unblockSchema),
  controller.unblock
);

// PATCH /api/moderation/appeals/:appealId/decision  { status: accepted|rejected, reason? }
router.patch(
  "/appeals/:appealId/decision",
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  validate(appealDecisionSchema),
  controller.decideAppeal
);

// GET /api/moderation/blocked/:userId/audit — "Download Audit" button
router.get("/blocked/:userId/audit", controller.audit);

module.exports = router;