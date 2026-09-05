const Joi = require("joi");

const { LOG_LEVELS, GATEWAY_NAMES, MAX_PAGE_SIZE } = require("./paymentLogs.constants");

const listLogsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(MAX_PAGE_SIZE).default(20),

  search: Joi.string().trim().max(100).optional(), // log id, payment id, trace id
  eventType: Joi.string().trim().max(50).optional(),
  level: Joi.string().valid(...LOG_LEVELS).optional(),
  gateway: Joi.string().valid(...GATEWAY_NAMES).optional(),
});

module.exports = { listLogsSchema };
