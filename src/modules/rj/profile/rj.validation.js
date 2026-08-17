// src/modules/rj/profile/rj.validation.js
const Joi = require("joi");
const {
  RJ_STATUSES,
  RJ_TIERS,
  VERIFICATION_STATUSES,
  RJ_ACCOUNT_STATUSES,
  MAX_PAGE_SIZE,
} = require("./rj.constants");

const updateRJSchema = Joi.object({
  bio: Joi.string().trim().max(1000).allow(null).optional(),
  tier: Joi.string().valid(...RJ_TIERS).optional(),
  experienceYears: Joi.number().integer().min(0).max(60).optional(),
  commissionRate: Joi.number().min(0).max(100).precision(2).optional(),
  categoryIds: Joi.array().items(Joi.number().integer().positive()).optional(),
}).min(1);

const updateAccountStatusSchema = Joi.object({
  status: Joi.string().valid(...RJ_ACCOUNT_STATUSES).required(),
  reason: Joi.string()
    .trim()
    .max(500)
    .when("status", {
      is: Joi.valid("suspended", "blocked"),
      then: Joi.required().messages({ "any.required": "A reason is required to suspend or block an RJ" }),
      otherwise: Joi.optional(),
    }),
});

const updatePresenceStatusSchema = Joi.object({
  status: Joi.string().valid(...RJ_STATUSES).required(),
});

const addNoteSchema = Joi.object({
  note: Joi.string().trim().min(1).max(2000).required(),
});

const listRJsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(MAX_PAGE_SIZE).optional(),
  search: Joi.string().trim().max(150).optional(),
  status: Joi.string().valid(...RJ_STATUSES).optional(),
  verificationStatus: Joi.string().valid(...VERIFICATION_STATUSES).optional(),
  tier: Joi.string().valid(...RJ_TIERS).optional(),
  categoryId: Joi.number().integer().positive().optional(),
  onlineOnly: Joi.boolean().truthy("true").falsy("false").optional(),
  sortBy: Joi.string().valid("approvedAt", "avgRating", "totalCallsCount", "lastActiveAt").optional(),
  sortOrder: Joi.string().valid("asc", "desc").optional(),
});

module.exports = {
  updateRJSchema,
  updateAccountStatusSchema,
  updatePresenceStatusSchema,
  addNoteSchema,
  listRJsQuerySchema,
};