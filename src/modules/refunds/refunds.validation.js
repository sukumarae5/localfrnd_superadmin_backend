const Joi = require("joi");

const { REFUND_STATUSES, MAX_PAGE_SIZE } = require("./refunds.constants");

const listRefundsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(MAX_PAGE_SIZE).default(20),

  search: Joi.string().trim().max(100).optional(), // REF/RF code, payment code, user name
  status: Joi.string().valid(...REFUND_STATUSES).optional(),
});

const createRefundSchema = Joi.object({
  paymentId: Joi.number().integer().positive().required(),
  amount: Joi.number().precision(2).positive().optional(), // omit = full refund
  reason: Joi.string().trim().min(3).max(500).required(),
});

const resolveRefundSchema = Joi.object({
  approvedAmount: Joi.number().precision(2).positive().optional(), // required only when approving
  resolutionNote: Joi.string().trim().max(500).allow("", null).optional(),
});

module.exports = {
  listRefundsSchema,
  createRefundSchema,
  resolveRefundSchema,
};
