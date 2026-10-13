// src/modules/cms/cms.validation.js
const Joi = require("joi");
const { CMS_PAGE_KEYS, CMS_PAGE_STATUSES, CMS_PLATFORMS } = require("./cms.constans");

const languageField = Joi.string().trim().lowercase().max(10).default("en");

const pageKeyParamSchema = Joi.object({
  pageKey: Joi.string().valid(...CMS_PAGE_KEYS).required(),
});

const revisionParamSchema = Joi.object({
  pageKey: Joi.string().valid(...CMS_PAGE_KEYS).required(),
  revisionId: Joi.string().pattern(/^\d+$/).required(),
});

// :sectionKey is free-form (hero, mission_vision, core_values, stats, team, offices...)
// so the admin UI can add new sections without a backend change.
const sectionParamSchema = Joi.object({
  pageKey: Joi.string().valid(...CMS_PAGE_KEYS).required(),
  sectionKey: Joi.string()
    .trim()
    .lowercase()
    .pattern(/^[a-z][a-z0-9_]{0,49}$/)
    .required(),
});

const languageQuerySchema = Joi.object({
  language: languageField,
});

// Public (app/web) read — optional platform filter driven by the Visibility card
const publicQuerySchema = Joi.object({
  language: languageField,
  platform: Joi.string().trim().lowercase().valid(...CMS_PLATFORMS),
});

const listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  pageKey: Joi.string().valid(...CMS_PAGE_KEYS),
  language: Joi.string().trim().lowercase().max(10),
  status: Joi.string().valid(...CMS_PAGE_STATUSES),
});

const seoSchema = Joi.object({
  metaTitle: Joi.string().trim().max(70).allow(""),
  metaDescription: Joi.string().trim().max(200).allow(""),
});

const visibilitySchema = Joi.object({
  android: Joi.boolean(),
  ios: Joi.boolean(),
  website: Joi.boolean(),
  landing: Joi.boolean(),
});

// PUT /admin/cms/pages/:pageKey — creates the row on first save, otherwise
// REPLACES title/slug/content (and seo/visibility if sent).
// NOTE: validation.middleware uses stripUnknown:true, so any top-level key not
// listed here (e.g. "seo", "visibility") used to be silently dropped — that is
// why only the content seemed to save.
const saveDraftSchema = Joi.object({
  language: languageField,
  title: Joi.string().trim().min(1).max(200).required(),
  slug: Joi.string().trim().lowercase().max(150).required(),
  content: Joi.object().unknown(true).default({}),
  seo: seoSchema,
  visibility: visibilitySchema,
  effectiveAt: Joi.date().iso().allow(null),
  changeNote: Joi.string().trim().max(300).allow("", null),
});

// PATCH /admin/cms/pages/:pageKey/sections/:sectionKey
// `data` is the whole value of ONE section (object, or array for lists like core_values/team)
const patchSectionSchema = Joi.object({
  language: languageField,
  data: Joi.alternatives().try(Joi.object().unknown(true), Joi.array()).required(),
  changeNote: Joi.string().trim().max(300).allow("", null),
});

// PUT /admin/cms/pages/:pageKey/settings — seo + visibility only (no content touched)
const updateSettingsSchema = Joi.object({
  language: languageField,
  seo: seoSchema,
  visibility: visibilitySchema,
}).or("seo", "visibility");

const publishSchema = Joi.object({
  language: languageField,
  changeNote: Joi.string().trim().max(300).allow("", null),
});

const updateStatusSchema = Joi.object({
  language: languageField,
  status: Joi.string().valid("draft", "archived").required(), // publishing has its own endpoint
});

const revisionsQuerySchema = Joi.object({
  language: languageField,
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

const restoreRevisionSchema = Joi.object({
  language: languageField,
});

module.exports = {
  pageKeyParamSchema,
  revisionParamSchema,
  sectionParamSchema,
  languageQuerySchema,
  publicQuerySchema,
  listQuerySchema,
  saveDraftSchema,
  patchSectionSchema,
  updateSettingsSchema,
  publishSchema,
  updateStatusSchema,
  revisionsQuerySchema,
  restoreRevisionSchema,
};