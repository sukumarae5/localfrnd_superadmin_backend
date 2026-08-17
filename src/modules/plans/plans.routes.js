const express = require("express");
const controller = require("./plans.controller");
const validate = require("../../middleware/validation.middleware");
const { authenticate, requireRole } = require("../../middleware/auth.middleware");
const { ADMIN_ROLES } = require("../../constants");
const {
  createPlanSchema, updatePlanSchema, setPlanActiveSchema, assignSubscriptionSchema, listSubscriptionsQuerySchema,
} = require("./plans.validation");

const router = express.Router();
router.use(authenticate);

// GET /api/plans?isActive=true
router.get("/", controller.list);
router.get("/:id", controller.getOne);
router.post("/", requireRole(ADMIN_ROLES.SUPER_ADMIN), validate(createPlanSchema), controller.create);
router.put("/:id", requireRole(ADMIN_ROLES.SUPER_ADMIN), validate(updatePlanSchema), controller.update);
router.patch("/:id/status", requireRole(ADMIN_ROLES.SUPER_ADMIN), validate(setPlanActiveSchema), controller.setActive);

// GET /api/plans/subscriptions/list?userId=&planId=&isCurrent=
router.get("/subscriptions/list", validate(listSubscriptionsQuerySchema, "query"), controller.listSubscriptions);
// POST /api/plans/subscriptions/assign  { userId, planId, expiresAt }
router.post(
  "/subscriptions/assign",
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  validate(assignSubscriptionSchema),
  controller.assign
);

module.exports = router;