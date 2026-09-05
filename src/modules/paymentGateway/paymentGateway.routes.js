const express = require("express");

const controller = require("./paymentGateway.controller");
const validate = require("../../middleware/validation.middleware");

const { authenticate, requireRole } = require("../../middleware/auth.middleware");
const { ADMIN_ROLES } = require("../../constants");

const {
  createGatewayConfigSchema,
  updateGatewayConfigSchema,
} = require("./paymentGateway.validation");

const router = express.Router();

router.use(authenticate);

// Ledger/list are readable by support; only super_admin/admin can
// create or touch API keys / webhook secrets.
router.get("/ledger", controller.ledger);
router.get("/", controller.list);
router.get("/:id", controller.getOne);

router.post(
  "/",
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  validate(createGatewayConfigSchema),
  controller.create
);

router.put(
  "/:id",
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  validate(updateGatewayConfigSchema),
  controller.update
);

module.exports = router;
