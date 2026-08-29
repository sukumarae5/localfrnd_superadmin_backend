const Joi = require("joi");

const { PAYMENT_METHODS } = require("./wallet.constants");

const listWalletsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),

  limit: Joi.number().integer().min(1).max(100).optional(),

  search: Joi.string().trim().max(150).optional(),

  minBalance: Joi.number().min(0).optional(),

  paymentMethod: Joi.string()
    .valid(...PAYMENT_METHODS)
    .optional(),
});

const creditDebitSchema = Joi.object({
  amount: Joi.number()
    .positive()
    .precision(2)
    .required(),

  coins: Joi.number()
    .integer()
    .min(0)
    .optional(),

  paymentMethod: Joi.string()
    .valid(...PAYMENT_METHODS)
    .optional(),

  description: Joi.string()
    .trim()
    .max(300)
    .required(),

  referenceId: Joi.string()
    .trim()
    .max(100)
    .optional(),
});

const freezeSchema = Joi.object({
  isFrozen: Joi.boolean().required(),
});

const listTxnsQuerySchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .optional(),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .optional(),
});

module.exports = {
  listWalletsQuerySchema,
  creditDebitSchema,
  freezeSchema,
  listTxnsQuerySchema,
};