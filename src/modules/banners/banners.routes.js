const express = require("express");
const controller = require("./banners.controller");
const validate = require("../../middleware/validation.middleware");
const { authenticate } = require("../../middleware/auth.middleware");
const uploadMemory = require("../../middleware/avatarUpload.middleware");
const {
  createBannerSchema,
  updateBannerSchema,
  changeStatusSchema,
  changePrioritySchema,
  scheduleSchema,
  approveAssetsSchema,
  bulkStatusSchema,
  bulkDeleteSchema,
  listBannersQuerySchema,
  statsQuerySchema,
  publicIdParam,
} = require("./banners.validation");

const router = express.Router();

router.use(authenticate);

// ---- Stats / dashboard cards (must come before "/:publicId") ----
router.get("/stats/summary", validate(statsQuerySchema, "query"), controller.getSummary);
router.get(
  "/stats/engagement-distribution",
  validate(statsQuerySchema, "query"),
  controller.getEngagementDistribution
);
router.get("/stats/top-performing", validate(statsQuerySchema, "query"), controller.getTopPerforming);

// ---- Bulk actions ----
router.post("/bulk-status", validate(bulkStatusSchema, "body"), controller.bulkChangeStatus);
router.post("/bulk-delete", validate(bulkDeleteSchema, "body"), controller.bulkDelete);

// ---- CRUD ----
router.post(
  "/",
  uploadMemory.single("image"),
  validate(createBannerSchema, "body"),
  controller.createBanner
);

router.get("/", validate(listBannersQuerySchema, "query"), controller.listBanners);

router.get("/:publicId", validate(publicIdParam, "params"), controller.getBanner);

router.put(
  "/:publicId",
  validate(publicIdParam, "params"),
  uploadMemory.single("image"),
  validate(updateBannerSchema, "body"),
  controller.updateBanner
);

router.delete("/:publicId", validate(publicIdParam, "params"), controller.deleteBanner);

// ---- Lifecycle actions ----
router.patch(
  "/:publicId/status",
  validate(publicIdParam, "params"),
  validate(changeStatusSchema, "body"),
  controller.changeStatus
);

router.patch(
  "/:publicId/priority",
  validate(publicIdParam, "params"),
  validate(changePrioritySchema, "body"),
  controller.changePriority
);

router.patch(
  "/:publicId/schedule",
  validate(publicIdParam, "params"),
  validate(scheduleSchema, "body"),
  controller.scheduleBanner
);

router.post(
  "/:publicId/approve-assets",
  validate(publicIdParam, "params"),
  validate(approveAssetsSchema, "body"),
  controller.approveAssets
);

module.exports = router;