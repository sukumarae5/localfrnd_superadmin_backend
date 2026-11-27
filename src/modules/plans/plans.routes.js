
const express = require("express");
const controller = require("./plans.controller");
const validate = require("../../middleware/validation.middleware");
const {
  authenticate,
  requireRole,
} = require("../../middleware/auth.middleware");
const uploadMemory = require("../../middleware/avatarUpload.middleware");
const { ADMIN_ROLES } = require("../../constants");

const {
  publicIdParam,
  createPlanSchema,
  updatePlanSchema,
  setPlanActiveSchema,
  listPlansQuerySchema,
  purchasePlanSchema,
  refundPurchaseSchema,
  assignSubscriptionSchema,
  listSubscriptionsQuerySchema,
} = require("./plans.validation");

const router = express.Router();

const planAssetUpload = uploadMemory.fields([
  { name: "icon", maxCount: 1 },
  { name: "banner", maxCount: 1 },
]);

// ==========================================
// PUBLIC MOBILE APP APIs
// No admin token required
// ==========================================

// Get active recharge plans
router.get(
  "/",
  validate(listPlansQuerySchema, "query"),
  controller.list
);

// Get one plan
router.get(
  "/:publicId",
  validate(publicIdParam, "params"),
  controller.getOne
);

// Record plan view
router.post(
  "/:publicId/view",
  validate(publicIdParam, "params"),
  controller.recordView
);

// ==========================================
// ADMIN APIs
// Admin authentication required
// ==========================================

// Dashboard
router.get(
  "/dashboard",
  authenticate,
  controller.dashboard
);

// Purchases
// NOTE: This currently retains admin authentication.
// Replace it with your mobile-user authentication middleware
// when you integrate the app's purchase flow.
router.post(
  "/purchases",
  authenticate,
  validate(purchasePlanSchema),
  controller.purchase
);

// Refund purchase
router.post(
  "/purchases/refund",
  authenticate,
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  validate(refundPurchaseSchema),
  controller.refund
);

// Legacy subscription APIs
router.get(
  "/subscriptions/list",
  authenticate,
  validate(listSubscriptionsQuerySchema, "query"),
  controller.listSubscriptions
);

router.post(
  "/subscriptions/assign",
  authenticate,
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  validate(assignSubscriptionSchema),
  controller.assign
);

// Create plan
router.post(
  "/",
  authenticate,
  requireRole(ADMIN_ROLES.SUPER_ADMIN),
  planAssetUpload,
  validate(createPlanSchema),
  controller.create
);

// Update plan
router.put(
  "/:publicId",
  authenticate,
  requireRole(ADMIN_ROLES.SUPER_ADMIN),
  validate(publicIdParam, "params"),
  planAssetUpload,
  validate(updatePlanSchema),
  controller.update
);

// Delete plan
router.delete(
  "/:publicId",
  authenticate,
  requireRole(ADMIN_ROLES.SUPER_ADMIN),
  validate(publicIdParam, "params"),
  controller.remove
);

// Activate/deactivate plan
router.patch(
  "/:publicId/status",
  authenticate,
  requireRole(ADMIN_ROLES.SUPER_ADMIN),
  validate(publicIdParam, "params"),
  validate(setPlanActiveSchema),
  controller.setActive
);

// Publish plan
router.post(
  "/:publicId/publish",
  authenticate,
  requireRole(ADMIN_ROLES.SUPER_ADMIN),
  validate(publicIdParam, "params"),
  controller.publish
);

// Duplicate plan
router.post(
  "/:publicId/duplicate",
  authenticate,
  requireRole(ADMIN_ROLES.SUPER_ADMIN),
  validate(publicIdParam, "params"),
  controller.duplicate
);

module.exports = router;
