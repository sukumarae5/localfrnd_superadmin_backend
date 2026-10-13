// src/modules/cms/cms.routes.js
// Mounted at /api/admin/cms — About Us / Privacy Policy / Terms & Conditions /
// Contact Us page content. Legal-document edits are elevated-permission only:
// the whole router is admin/super_admin.
const express = require("express");
const controller = require("./cms.controller");
const validate = require("../../middleware/validation.middleware");
const { authenticate, requireRole } = require("../../middleware/auth.middleware");
const uploadMemory = require("../../middleware/avatarUpload.middleware");
const { ADMIN_ROLES } = require("../../constants");
const {
  pageKeyParamSchema,
  revisionParamSchema,
  sectionParamSchema,
  languageQuerySchema,
  listQuerySchema,
  saveDraftSchema,
  patchSectionSchema,
  updateSettingsSchema,
  publishSchema,
  updateStatusSchema,
  revisionsQuerySchema,
  restoreRevisionSchema,
} = require("./cms.validation");

const router = express.Router();

router.use(authenticate, requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN));

// GET /api/admin/cms/pages?pageKey=&language=&status=
router.get("/pages", validate(listQuerySchema, "query"), controller.listPages);

// GET /api/admin/cms/pages/:pageKey?language=en
router.get(
  "/pages/:pageKey",
  validate(pageKeyParamSchema, "params"),
  validate(languageQuerySchema, "query"),
  controller.getPage
);

// PUT /api/admin/cms/pages/:pageKey — FULL save (creates on first save, replaces content after)
router.put(
  "/pages/:pageKey",
  validate(pageKeyParamSchema, "params"),
  validate(saveDraftSchema, "body"),
  controller.saveDraft
);

// PATCH /api/admin/cms/pages/:pageKey/sections/:sectionKey — add/replace ONE section
router.patch(
  "/pages/:pageKey/sections/:sectionKey",
  validate(sectionParamSchema, "params"),
  validate(patchSectionSchema, "body"),
  controller.patchSection
);

// DELETE /api/admin/cms/pages/:pageKey/sections/:sectionKey?language=en — remove ONE section
router.delete(
  "/pages/:pageKey/sections/:sectionKey",
  validate(sectionParamSchema, "params"),
  validate(languageQuerySchema, "query"),
  controller.removeSection
);

// PUT /api/admin/cms/pages/:pageKey/settings — SEO + Visibility only
router.put(
  "/pages/:pageKey/settings",
  validate(pageKeyParamSchema, "params"),
  validate(updateSettingsSchema, "body"),
  controller.updateSettings
);

// POST /api/admin/cms/pages/:pageKey/upload-image — form-data, field "image"
router.post(
  "/pages/:pageKey/upload-image",
  validate(pageKeyParamSchema, "params"),
  uploadMemory.single("image"),
  controller.uploadImage
);

// POST /api/admin/cms/pages/:pageKey/publish
router.post(
  "/pages/:pageKey/publish",
  validate(pageKeyParamSchema, "params"),
  validate(publishSchema, "body"),
  controller.publishPage
);

// PATCH /api/admin/cms/pages/:pageKey/status  { status: "draft" | "archived" }
router.patch(
  "/pages/:pageKey/status",
  validate(pageKeyParamSchema, "params"),
  validate(updateStatusSchema, "body"),
  controller.updateStatus
);

// GET /api/admin/cms/pages/:pageKey/revisions?language=&page=&limit=
router.get(
  "/pages/:pageKey/revisions",
  validate(pageKeyParamSchema, "params"),
  validate(revisionsQuerySchema, "query"),
  controller.listRevisions
);

// POST /api/admin/cms/pages/:pageKey/revisions/:revisionId/restore
router.post(
  "/pages/:pageKey/revisions/:revisionId/restore",
  validate(revisionParamSchema, "params"),
  validate(restoreRevisionSchema, "body"),
  controller.restoreRevision
);

module.exports = router;