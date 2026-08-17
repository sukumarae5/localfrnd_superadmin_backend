const express = require("express");
const controller = require("./admin.controller");
const validate = require("../../middleware/validation.middleware");
const { authenticate, requireRole } = require("../../middleware/auth.middleware");
const { ADMIN_ROLES } = require("../../constants");
const {
  createAdminSchema,
  updateAdminSchema,
  changeOwnPasswordSchema,
  resetAdminPasswordSchema,
} = require("./admin.validation");

const router = express.Router();

router.patch(
  "/me/password",
  authenticate,
  validate(changeOwnPasswordSchema),
  controller.changeOwnPassword
);

router.post(
  "/",
  authenticate,
  requireRole(ADMIN_ROLES.SUPER_ADMIN),
  validate(createAdminSchema),
  controller.create
);

router.get("/", authenticate, requireRole(ADMIN_ROLES.SUPER_ADMIN), controller.list);

router.get("/:publicId", authenticate, requireRole(ADMIN_ROLES.SUPER_ADMIN), controller.getOne);

router.patch(
  "/:publicId",
  authenticate,
  requireRole(ADMIN_ROLES.SUPER_ADMIN),
  validate(updateAdminSchema),
  controller.update
);

router.patch(
  "/:publicId/password",
  authenticate,
  requireRole(ADMIN_ROLES.SUPER_ADMIN),
  validate(resetAdminPasswordSchema),
  controller.resetPassword
);

router.delete(
  "/:publicId",
  authenticate,
  requireRole(ADMIN_ROLES.SUPER_ADMIN),
  controller.deactivate
);

module.exports = router;