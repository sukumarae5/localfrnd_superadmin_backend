// src/modules/rj/performance/performance.validation.js
const Joi = require("joi");
const { MAX_PAGE_SIZE } = require("./performance.constants");

const listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(MAX_PAGE_SIZE).optional(),
  search: Joi.string().trim().max(150).optional(),
  categoryId: Joi.number().integer().positive().optional(),
  sortBy: Joi.string().valid("avgRating", "totalCallsCount", "approvedAt").optional(),
  sortOrder: Joi.string().valid("asc", "desc").optional(),
});

module.exports = { listQuerySchema };