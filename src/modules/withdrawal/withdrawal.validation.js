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

// ---- RJ-facing (mobile app) ----
// withdrawal.routes.js has imported these three since it was written —
// they just never existed here, which made every /withdrawals/mine* route
// throw "Cannot read properties of undefined (reading 'validate')" on every
// call. repository.createWithdrawalRequest() destructures
// { amount, method, vpa, bankAccountMasked, ifscCode } from the body, so
// those are the real fields the service layer expects.
const createWithdrawalSchema = Joi.object({
  amount: Joi.number().positive().precision(2).required(),
  method: Joi.string().valid(...PAYMENT_METHODS).required(),
  vpa: Joi.string().trim().max(150).when("method", {
    is: "upi",
    then: Joi.required(),
    otherwise: Joi.optional().allow("", null),
  }),
  bankAccountMasked: Joi.string().trim().max(30).when("method", {
    is: "bank_transfer",
    then: Joi.required(),
    otherwise: Joi.optional().allow("", null),
  }),
  ifscCode: Joi.string().trim().uppercase().max(15).when("method", {
    is: "bank_transfer",
    then: Joi.required(),
    otherwise: Joi.optional().allow("", null),
  }),
});

const listMyWithdrawalsQuerySchema = Joi.object({
  status: Joi.string().valid(...WITHDRAWAL_STATUSES).optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
});

const appealSchema = Joi.object({
  appealMessage: Joi.string().trim().min(10).max(1000).required(),
});

module.exports = {
  listWithdrawalsQuerySchema,
  rejectSchema,
  bulkIdsSchema,
  bulkRejectSchema,
  createWithdrawalSchema,
  listMyWithdrawalsQuerySchema,
  appealSchema,
};