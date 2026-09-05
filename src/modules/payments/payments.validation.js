const Joi = require("joi");

const {
  PAYMENT_TYPES,
  PAYMENT_GATEWAYS,
  PAYMENT_STATUSES,
  MAX_PAGE_SIZE,
} = require("./payments.constants");

const listPaymentsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(MAX_PAGE_SIZE).default(20),

  search: Joi.string().trim().max(100).optional(), // matches PAY-xxxxx, order id, or user name

  type: Joi.string().valid(...PAYMENT_TYPES).optional(),
  gateway: Joi.string().valid(...PAYMENT_GATEWAYS).optional(),
  status: Joi.string().valid(...PAYMENT_STATUSES).optional(),

  userId: Joi.number().integer().positive().optional(),

  dateFrom: Joi.date().iso().optional(),
  dateTo: Joi.date().iso().min(Joi.ref("dateFrom")).optional(),
});

const issueRefundSchema = Joi.object({
  amount: Joi.number().precision(2).positive().optional(), // omit = full refund
  reason: Joi.string().trim().min(3).max(500).required(),
});

module.exports = {
  listPaymentsSchema,
  issueRefundSchema,
};
