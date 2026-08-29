const express = require("express");

const controller =
  require("./coinPackage.controller");

const validate =
  require("../../middleware/validation.middleware");

const {
  authenticate,
  requireRole,
} = require("../../middleware/auth.middleware");

const {
  ADMIN_ROLES,
} = require("../../constants");

const {
  createCoinPackageSchema,
  updateCoinPackageSchema,
  listCoinPackagesSchema,
  updateStatusSchema,
  updatePopularSchema,
  reorderCoinPackagesSchema,
} = require("./coinPackage.validation");

const router = express.Router();

router.use(authenticate);

router.get(
  "/",
  validate(
    listCoinPackagesSchema,
    "query"
  ),
  controller.list
);

router.get(
  "/:id",
  controller.getOne
);

router.post(
  "/",
  requireRole(
    ADMIN_ROLES.SUPER_ADMIN,
    ADMIN_ROLES.ADMIN
  ),
  validate(createCoinPackageSchema),
  controller.create
);

router.put(
  "/:id",
  requireRole(
    ADMIN_ROLES.SUPER_ADMIN,
    ADMIN_ROLES.ADMIN
  ),
  validate(updateCoinPackageSchema),
  controller.update
);

router.patch(
  "/:id/status",
  requireRole(
    ADMIN_ROLES.SUPER_ADMIN,
    ADMIN_ROLES.ADMIN
  ),
  validate(updateStatusSchema),
  controller.updateStatus
);

router.patch(
  "/:id/popular",
  requireRole(
    ADMIN_ROLES.SUPER_ADMIN,
    ADMIN_ROLES.ADMIN
  ),
  validate(updatePopularSchema),
  controller.updatePopular
);

/*
IMPORTANT:
This route must come before /:id.
*/

router.patch(
  "/reorder/list",
  requireRole(
    ADMIN_ROLES.SUPER_ADMIN,
    ADMIN_ROLES.ADMIN
  ),
  validate(
    reorderCoinPackagesSchema
  ),
  controller.reorder
);

router.delete(
  "/:id",
  requireRole(
    ADMIN_ROLES.SUPER_ADMIN
  ),
  controller.remove
);

module.exports = router;