// src/modules/cms/cms.public.routes.js
// Mounted at /api/public/cms — genuinely no auth (unlike
// banners.public.routes.js, which despite its name currently requires a
// user token). Privacy Policy / Terms & Conditions in particular must be
// readable before signup/login, so this route deliberately has zero
// middleware in front of it beyond validation.
const express = require("express");
const controller = require("./cms.controller");
const validate = require("../../middleware/validation.middleware");
const { pageKeyParamSchema, languageQuerySchema } = require("./cms.validation");

const router = express.Router();

// GET /api/public/cms/pages/:pageKey?language=en — published content only
router.get(
  "/pages/:pageKey",
  validate(pageKeyParamSchema, "params"),
  validate(languageQuerySchema, "query"),
  controller.getPublishedPage
);

module.exports = router;