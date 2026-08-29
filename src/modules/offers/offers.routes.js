const express = require("express");
const controller = require("./offers.controller");
const validate = require("../../middleware/validation.middleware");
const { authenticate, requireRole } = require("../../middleware/auth.middleware");
const uploadMemory = require("../../middleware/avatarUpload.middleware");
const { ADMIN_ROLES } = require("../../constants");
const {
  publicIdParam,
  createOfferSchema,
  updateOfferSchema,
  changeStatusSchema,
  bulkStatusSchema,
  listOffersQuerySchema,
} = require("./offers.validation");

const router = express.Router();

router.use(authenticate);

// ---- Dashboard (stat cards + conversion funnel + daily redemptions + recent activity) ----
router.get("/dashboard", controller.dashboard);

// ---- Bulk actions ----
router.post(
  "/bulk-status",
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  validate(bulkStatusSchema, "body"),
  controller.bulkChangeStatus
);

// ---- CRUD ----
router.post(
  "/",
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  uploadMemory.single("banner"),
  validate(createOfferSchema, "body"),
  controller.create
);

router.get("/", validate(listOffersQuerySchema, "query"), controller.list);

router.get("/:publicId", validate(publicIdParam, "params"), controller.getOne);

router.put(
  "/:publicId",
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  validate(publicIdParam, "params"),
  uploadMemory.single("banner"),
  validate(updateOfferSchema, "body"),
  controller.update
);

router.delete(
  "/:publicId",
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  validate(publicIdParam, "params"),
  controller.remove
);

router.patch(
  "/:publicId/status",
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  validate(publicIdParam, "params"),
  validate(changeStatusSchema, "body"),
  controller.changeStatus
);

router.post("/:publicId/click", validate(publicIdParam, "params"), controller.trackClick);

module.exports = router;