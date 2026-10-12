const Joi = require("joi");
const { FAQ_STATUSES } = require("./faq.constants");

const publicIdParamSchema = Joi.object({
  publicId: Joi.string().uuid().required(),
});

const createSchema = Joi.object({
  categoryPublicId: Joi.string().uuid().required(),
  question: Joi.string().trim().min(3).max(300).required(),
  answer: Joi.string().trim().min(1).required(),
  language: Joi.string().trim().lowercase().max(10).default("en"),
  sortOrder: Joi.number().integer().min(0).default(0),
  status: Joi.string().valid(...FAQ_STATUSES).default("draft"),
});

const updateSchema = Joi.object({
  categoryPublicId: Joi.string().uuid(),
  question: Joi.string().trim().min(3).max(300),
  answer: Joi.string().trim().min(1),
  language: Joi.string().trim().lowercase().max(10),
  sortOrder: Joi.number().integer().min(0),
  status: Joi.string().valid(...FAQ_STATUSES),
}).min(1);

const listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  categoryPublicId: Joi.string().uuid(),
  status: Joi.string().valid(...FAQ_STATUSES),
  language: Joi.string().trim().lowercase().max(10),
  search: Joi.string().trim().max(100).allow(""),
  sortBy: Joi.string().valid("question", "createdAt", "sortOrder").default("sortOrder"),
  sortDir: Joi.string().valid("asc", "desc").default("asc"),
});

// GET /public/faqs — published-only, app-facing
const publicListQuerySchema = Joi.object({
  categoryPublicId: Joi.string().uuid(),
  language: Joi.string().trim().lowercase().max(10).default("en"),
  search: Joi.string().trim().max(100).allow(""),
});

module.exports = { publicIdParamSchema, createSchema, updateSchema, listQuerySchema, publicListQuerySchema };