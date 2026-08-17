const Joi = require("joi");
const { RISK_LEVELS } = require("./activity.constants");

const listLogsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  search: Joi.string().trim().max(150).optional(),
  activityType: Joi.string().trim().max(30).optional(),
  riskLevel: Joi.string().valid(...RISK_LEVELS).optional(),
  dateFrom: Joi.date().iso().optional(),
  dateTo: Joi.date().iso().optional(),
});

const listSessionsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  userId: Joi.number().integer().positive().optional(),
  isActive: Joi.boolean().truthy("true").falsy("false").optional(),
});

const feedQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(50).optional(),
});

module.exports = { listLogsQuerySchema, listSessionsQuerySchema, feedQuerySchema };