const Joi = require("joi");
const { BANK_ACCOUNT_STATUSES } = require("./bankAccount.constants");

const listBankAccountsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  status: Joi.string().valid(...BANK_ACCOUNT_STATUSES).optional(),
  search: Joi.string().trim().max(150).optional(), // RJ name / RJ-ID
  accountOrUpi: Joi.string().trim().max(100).optional(),
  bankName: Joi.string().trim().max(100).optional(),
  duplicatesOnly: Joi.boolean().optional(),
});

const approveSchema = Joi.object({
  note: Joi.string().trim().max(500).allow("").optional(),
  markPrimary: Joi.boolean().optional(),
});

const rejectSchema = Joi.object({
  reason: Joi.string().trim().max(500).required(),
});

const noteSchema = Joi.object({
  note: Joi.string().trim().max(1000).required(),
});

module.exports = { listBankAccountsQuerySchema, approveSchema, rejectSchema, noteSchema };