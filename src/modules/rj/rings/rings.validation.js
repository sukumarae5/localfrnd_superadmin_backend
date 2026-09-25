// src/modules/rj/rings/rings.validation.js
const Joi = require("joi");
const { RING_TXN_TYPES } = require("./rings.constants");

const listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  type: Joi.string().valid(...RING_TXN_TYPES).optional(),
});

// She types how many rings she wants to convert — must be a whole number,
// the service enforces the minimum-threshold and balance checks.
const convertRingsSchema = Joi.object({
  rings: Joi.number().integer().positive().required(),
});

// Admin-only — updates the singleton conversion rate / threshold.
const updateSettingSchema = Joi.object({
  conversionRate: Joi.number().positive().precision(4).optional(),
  minConvertibleRings: Joi.number().integer().positive().optional(),
}).min(1);

module.exports = {
  listQuerySchema,
  convertRingsSchema,
  updateSettingSchema,
};