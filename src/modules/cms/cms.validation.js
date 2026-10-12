const Joi = require("joi");
const { CMS_PAGE_KEYS, CMS_PAGE_STATUSES } = require("./cms.constans");

const pageKeyParamSchema = Joi.object({
  pageKey: Joi.string().valid(...CMS_PAGE_KEYS).required(),
});

const revisionParamSchema = Joi.object({
  pageKey: Joi.string().valid(...CMS_PAGE_KEYS).required(),
  revisionId: Joi.string().pattern(/^\d+$/).required(),
});

const languageQuerySchema = Joi.object({
  language: Joi.string().trim().lowercase().max(10).default("en"),
});

const listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  pageKey: Joi.string().valid(...CMS_PAGE_KEYS),
  language: Joi.string().trim().lowercase().max(10),
  status: Joi.string().valid(...CMS_PAGE_STATUSES),
});

// PUT /admin/cms/pages/:pageKey — creates the row on first save, otherwise
// updates it. Always writes a CmsPageRevision snapshot (see service).
const saveDraftSchema = Joi.object({
  language: Joi.string().trim().lowercase().max(10).default("en"),
  title: Joi.string().trim().min(1).max(200).required(),
  slug: Joi.string().trim().lowercase().max(150).required(),
  content: Joi.object().unknown(true).default({}),
  effectiveAt: Joi.date().iso().allow(null),
  changeNote: Joi.string().trim().max(300).allow("", null),
});

const publishSchema = Joi.object({
  language: Joi.string().trim().lowercase().max(10).default("en"),
  changeNote: Joi.string().trim().max(300).allow("", null),
});

const updateStatusSchema = Joi.object({
  language: Joi.string().trim().lowercase().max(10).default("en"),
  status: Joi.string().valid("draft", "archived").required(), // publishing has its own endpoint
});

const revisionsQuerySchema = Joi.object({
  language: Joi.string().trim().lowercase().max(10).default("en"),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

const restoreRevisionSchema = Joi.object({
  language: Joi.string().trim().lowercase().max(10).default("en"),
});

module.exports = {
  pageKeyParamSchema,
  revisionParamSchema,
  languageQuerySchema,
  listQuerySchema,
  saveDraftSchema,
  publishSchema,
  updateStatusSchema,
  revisionsQuerySchema,
  restoreRevisionSchema,
};