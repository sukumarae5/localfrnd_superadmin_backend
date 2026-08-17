const Joi = require("joi");

const createPlanSchema = Joi.object({
  code: Joi.string().trim().uppercase().max(30).required(),
  displayName: Joi.string().trim().max(50).required(),
  coins: Joi.number().integer().min(0).required(),
  minutes: Joi.number().integer().min(0).required(),
  originalPrice: Joi.number().positive().precision(2).required(),
  discountPercent: Joi.number().integer().min(0).max(100).default(0),
  // priceAfterDiscount is derived server-side in the service layer — see note below —
  // so it's intentionally NOT accepted here. Sending it from the client is ignored.
  isActive: Joi.boolean().optional(),
  features: Joi.object().optional(),
});

const updatePlanSchema = Joi.object({
  displayName: Joi.string().trim().max(50).optional(),
  coins: Joi.number().integer().min(0).optional(),
  minutes: Joi.number().integer().min(0).optional(),
  originalPrice: Joi.number().positive().precision(2).optional(),
  discountPercent: Joi.number().integer().min(0).max(100).optional(),
  features: Joi.object().optional(),
}).min(1);

const setPlanActiveSchema = Joi.object({
  isActive: Joi.boolean().required(),
});

const assignSubscriptionSchema = Joi.object({
  userId: Joi.number().integer().positive().required(),
  planId: Joi.number().integer().positive().required(),
  expiresAt: Joi.date().iso().allow(null).optional(),
});

const listSubscriptionsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  userId: Joi.number().integer().positive().optional(),
  planId: Joi.number().integer().positive().optional(),
  isCurrent: Joi.boolean().truthy("true").falsy("false").optional(),
});

module.exports = {
  createPlanSchema,
  updatePlanSchema,
  setPlanActiveSchema,
  assignSubscriptionSchema,
  listSubscriptionsQuerySchema,
};