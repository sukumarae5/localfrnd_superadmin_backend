const Joi = require("joi");

const {
  COIN_TRANSACTION_TYPES,
  COIN_TRANSACTION_STATUS,
  MAX_PAGE_SIZE,
} = require("./coinTransaction.constants");

const listCoinTransactionsSchema =
  Joi.object({
    page: Joi.number()
      .integer()
      .min(1)
      .default(1),

    limit: Joi.number()
      .integer()
      .min(1)
      .max(MAX_PAGE_SIZE)
      .default(20),

    userId: Joi.number()
      .integer()
      .positive()
      .optional(),

    coinPackageId: Joi.number()
      .integer()
      .positive()
      .optional(),

    type: Joi.string()
      .valid(
        ...Object.values(
          COIN_TRANSACTION_TYPES
        )
      )
      .optional(),

    status: Joi.string()
      .valid(
        ...Object.values(
          COIN_TRANSACTION_STATUS
        )
      )
      .optional(),
  });

const initiatePurchaseSchema =
  Joi.object({
    coinPackageId: Joi.number()
      .integer()
      .positive()
      .required(),
  });

module.exports = {
  listCoinTransactionsSchema,
  initiatePurchaseSchema,
};