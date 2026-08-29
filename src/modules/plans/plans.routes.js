const express = require("express");
const controller = require("./plans.controller");
const validate = require("../../middleware/validation.middleware");
const { authenticate, requireRole } = require("../../middleware/auth.middleware");
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
const planAssetUpload = uploadMemory.fields([{ name: "icon", maxCount: 1 }, { name: "banner", maxCount: 1 }]);

router.use(authenticate);

// ---- Dashboard (Recharge Plans list screen cards + top-selling + revenue summary + recent purchases) ----
router.get("/dashboard", controller.dashboard);

// ---- Purchases (mobile/user-facing purchase confirmation + admin refund) ----
router.post("/purchases", validate(purchasePlanSchema), controller.purchase);
router.post(
  "/purchases/refund",
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  validate(refundPurchaseSchema),
  controller.refund
);

// ---- Legacy subscription assignment (kept for backward compatibility) ----
router.get("/subscriptions/list", validate(listSubscriptionsQuerySchema, "query"), controller.listSubscriptions);
router.post(
  "/subscriptions/assign",
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  validate(assignSubscriptionSchema),
  controller.assign
);

// ---- CRUD ----
router.get("/", validate(listPlansQuerySchema, "query"), controller.list);

router.post(
  "/",
  requireRole(ADMIN_ROLES.SUPER_ADMIN),
  planAssetUpload,
  validate(createPlanSchema),
  controller.create
);

router.get("/:publicId", validate(publicIdParam, "params"), controller.getOne);

router.put(
  "/:publicId",
  requireRole(ADMIN_ROLES.SUPER_ADMIN),
  validate(publicIdParam, "params"),
  planAssetUpload,
  validate(updatePlanSchema),
  controller.update
);

router.delete(
  "/:publicId",
  requireRole(ADMIN_ROLES.SUPER_ADMIN),
  validate(publicIdParam, "params"),
  controller.remove
);

router.patch(
  "/:publicId/status",
  requireRole(ADMIN_ROLES.SUPER_ADMIN),
  validate(publicIdParam, "params"),
  validate(setPlanActiveSchema),
  controller.setActive
);

router.post(
  "/:publicId/publish",
  requireRole(ADMIN_ROLES.SUPER_ADMIN),
  validate(publicIdParam, "params"),
  controller.publish
);

router.post(
  "/:publicId/duplicate",
  requireRole(ADMIN_ROLES.SUPER_ADMIN),
  validate(publicIdParam, "params"),
  controller.duplicate
);

router.post("/:publicId/view", validate(publicIdParam, "params"), controller.recordView);

module.exports = router;