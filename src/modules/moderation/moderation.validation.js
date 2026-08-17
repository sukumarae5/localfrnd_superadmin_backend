const Joi = require("joi");
const { BLOCK_TYPES, APPEAL_STATUSES } = require("./moderation.constants");

const listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  search: Joi.string().trim().max(150).optional(),
  blockType: Joi.string().valid(...BLOCK_TYPES).optional(),
  reason: Joi.string().trim().max(100).optional(),
  appealStatus: Joi.string().valid(...APPEAL_STATUSES).optional(),
  dateFrom: Joi.date().iso().optional(),
  dateTo: Joi.date().iso().optional(),
});

const updateBlockSchema = Joi.object({
  blockType: Joi.string().valid(...BLOCK_TYPES).optional(),
  expiresAt: Joi.date().iso().allow(null).optional(),
  reason: Joi.string().trim().max(500).optional(),
}).min(1);

const unblockSchema = Joi.object({
  reason: Joi.string().trim().max(500).optional(),
});

const appealDecisionSchema = Joi.object({
  status: Joi.string().valid("accepted", "rejected").required(),
  reason: Joi.string().trim().max(500).when("status", {
    is: "rejected",
    then: Joi.optional(),
    otherwise: Joi.optional(),
  }),
});

module.exports = {
  listQuerySchema,
  updateBlockSchema,
  unblockSchema,
  appealDecisionSchema,
};