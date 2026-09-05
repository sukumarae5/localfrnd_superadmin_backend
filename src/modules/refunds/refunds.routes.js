const express = require("express");

const controller = require("./refunds.controller");
const validate = require("../../middleware/validation.middleware");

const { authenticate, requireRole } = require("../../middleware/auth.middleware");
const { ADMIN_ROLES } = require("../../constants");

const {
  listRefundsSchema,
  createRefundSchema,
  resolveRefundSchema,
} = require("./refunds.validation");

const router = express.Router();

router.use(authenticate);

router.get("/dashboard", controller.dashboard);
router.get("/", validate(listRefundsSchema, "query"), controller.list);
router.get("/:idOrCode", controller.getOne);

router.post(
  "/",
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPPORT),
  validate(createRefundSchema),
  controller.create
);

router.patch(
  "/:id/approve",
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  validate(resolveRefundSchema),
  controller.approve
);

router.patch(
  "/:id/reject",
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  validate(resolveRefundSchema),
  controller.reject
);

module.exports = router;
