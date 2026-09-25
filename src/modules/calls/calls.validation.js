const Joi = require("joi");
const { CALL_TYPES, CALL_MODES } = require("./calls.constants");

const startCallSchema = Joi.object({
  callType: Joi.string().valid(...CALL_TYPES).required(),
});

const endCallSchema = Joi.object({
  sessionPublicId: Joi.string().uuid().required(),
});

const sessionRefSchema = Joi.object({
  sessionPublicId: Joi.string().uuid().required(),
});

const availableRJsQuerySchema = Joi.object({
  callType: Joi.string().valid(...CALL_TYPES).optional(),
  city: Joi.string().trim().max(100).optional(),
  state: Joi.string().trim().max(100).optional(),
  country: Joi.string().trim().max(100).optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
});

const qualitySchema = Joi.object({
  quality: Joi.string().valid("poor", "average", "good", "excellent").required(),
});

const listCallsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  rjId: Joi.number().integer().positive().optional(),
  userId: Joi.number().integer().positive().optional(),
  status: Joi.string().valid("ringing", "ongoing", "completed", "missed", "rejected", "cancelled", "dropped").optional(),
  callType: Joi.string().valid(...CALL_TYPES).optional(),
  callMode: Joi.string().valid(...CALL_MODES).optional(),
  dateFrom: Joi.date().iso().optional(),
  dateTo: Joi.date().iso().optional(),
});

const historyQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
});

const counterpartUserIdParamSchema = Joi.object({
  counterpartUserId: Joi.number().integer().positive().required(),
});

module.exports = {
  startCallSchema, endCallSchema, sessionRefSchema, availableRJsQuerySchema,
  qualitySchema, listCallsQuerySchema, historyQuerySchema, counterpartUserIdParamSchema,
};