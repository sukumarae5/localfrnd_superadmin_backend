// src/modules/cms/cms.public.routes.js
// Mounted at /api/public/cms — genuinely no auth. Privacy Policy / Terms must be
// readable before signup/login.
const express = require("express");
const controller = require("./cms.controller");
const validate = require("../../middleware/validation.middleware");
const { pageKeyParamSchema, publicQuerySchema } = require("./cms.validation");

const router = express.Router();

// GET /api/public/cms/pages/:pageKey?language=en&platform=android — published content only
router.get(
  "/pages/:pageKey",
  validate(pageKeyParamSchema, "params"),
  validate(publicQuerySchema, "query"),
  controller.getPublishedPage
);

module.exports = router;