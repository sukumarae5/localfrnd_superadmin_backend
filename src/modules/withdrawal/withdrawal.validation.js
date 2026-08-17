const Joi = require("joi");
const { WITHDRAWAL_STATUSES, REJECTION_CODES } = require("./withdrawal.constants");
const { PAYMENT_METHODS } = require("../wallet/wallet.constants");

const listWithdrawalsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  status: Joi.string().valid(...WITHDRAWAL_STATUSES).optional(),
  search: Joi.string().trim().max(150).optional(),
  category: Joi.string().trim().max(50).optional(),
  amountMin: Joi.number().min(0).optional(),
  amountMax: Joi.number().min(0).optional(),
  kycStatus: Joi.string().valid("unverified", "pending", "verified").optional(),
  paymentMethod: Joi.string().valid(...PAYMENT_METHODS).optional(),
});

const rejectSchema = Joi.object({
  rejectionCode: Joi.string().valid(...REJECTION_CODES).required(),
  rejectionReason: Joi.string().trim().max(500).required(),
});

const bulkIdsSchema = Joi.object({
  ids: Joi.array().items(Joi.string()).min(1).required(),
});

const bulkRejectSchema = bulkIdsSchema.keys({
  rejectionCode: Joi.string().valid(...REJECTION_CODES).required(),
  rejectionReason: Joi.string().trim().max(500).required(),
});

module.exports = { listWithdrawalsQuerySchema, rejectSchema, bulkIdsSchema, bulkRejectSchema };