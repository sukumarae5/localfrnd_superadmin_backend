const Joi = require("joi");
const { BANK_ACCOUNT_STATUSES } = require("./bankaccount.constants");

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

// ---- RJ-facing (mobile app) ----
// Deliberately excludes status/isPrimary/verification fields — an RJ submits
// raw details, she can never self-verify or silently flip her own status.
const createMineSchema = Joi.object({
  bankName: Joi.string().trim().max(100).allow("", null),
  accountType: Joi.string().valid("savings", "current").allow("", null),
  accountNumber: Joi.string().trim().min(6).max(30),
  ifscCode: Joi.string().trim().uppercase().max(15),
  upiId: Joi.string().trim().max(150),
  accountHolderName: Joi.string().trim().max(100).allow("", null),
})
  .or("accountNumber", "upiId") // at least a bank account OR a UPI id
  .and("accountNumber", "ifscCode"); // if a bank account is given, the IFSC must come with it

module.exports = { listBankAccountsQuerySchema, approveSchema, rejectSchema, noteSchema, createMineSchema };