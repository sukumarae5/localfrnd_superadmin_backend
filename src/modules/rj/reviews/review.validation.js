// src/modules/rj/review/review.validation.js
const Joi = require("joi");
const { REVIEW_SENTIMENTS, REVIEW_STATUSES, MAX_PAGE_SIZE } = require("./review.constants");

const listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(MAX_PAGE_SIZE).optional(),
  search: Joi.string().trim().max(150).optional(),
  rating: Joi.number().integer().min(1).max(5).optional(),
  sentiment: Joi.string().valid(...REVIEW_SENTIMENTS).optional(),
  status: Joi.string().valid(...REVIEW_STATUSES).optional(),
  dateFrom: Joi.date().iso().optional(),
  dateTo: Joi.date().iso().optional(),
  sortBy: Joi.string().valid("createdAt", "rating").optional(),
  sortOrder: Joi.string().valid("asc", "desc").optional(),
});

const submitReviewSchema = Joi.object({
  rjId: Joi.number().integer().positive().required(),
  userId: Joi.number().integer().positive().required(),
  callSessionId: Joi.number().integer().positive().optional(),
  rating: Joi.number().integer().min(1).max(5).required(),
  reviewText: Joi.string().trim().max(2000).allow("", null).optional(),
});

const moderateSchema = Joi.object({
  action: Joi.string().valid("flag", "remove", "restore").required(),
});

module.exports = { listQuerySchema, submitReviewSchema, moderateSchema };