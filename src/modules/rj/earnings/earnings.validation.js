// src/modules/rj/earnings/earnings.validation.js
const Joi = require("joi");
const { RJ_WALLET_TXN_TYPES, PAYMENT_METHODS, MAX_PAGE_SIZE } = require("./earnings.constants");
const { RJ_TIERS, RJ_ACCOUNT_STATUSES } = require("../profile/rj.constants");

const listEarningsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(MAX_PAGE_SIZE).optional(),
  search: Joi.string().trim().max(150).optional(),
  tier: Joi.string().valid(...RJ_TIERS).optional(),
  status: Joi.string().valid(...RJ_ACCOUNT_STATUSES).optional(),
});

const listTxnsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(MAX_PAGE_SIZE).optional(),
  type: Joi.string().valid(...RJ_WALLET_TXN_TYPES).optional(),
});

const payoutSchema = Joi.object({
  amount: Joi.number().positive().precision(2).required(),
  method: Joi.string().valid(...PAYMENT_METHODS).optional(),
});

const bonusSchema = Joi.object({
  amount: Joi.number().positive().precision(2).required(),
  description: Joi.string().trim().max(300).optional(),
});

const commissionSchema = Joi.object({
  commissionRate: Joi.number().min(0).max(100).precision(2).required(),
});

const statementQuerySchema = Joi.object({
  dateFrom: Joi.date().iso().optional(),
  dateTo: Joi.date().iso().optional(),
});

module.exports = {
  listEarningsQuerySchema,
  listTxnsQuerySchema,
  payoutSchema,
  bonusSchema,
  commissionSchema,
  statementQuerySchema,
};