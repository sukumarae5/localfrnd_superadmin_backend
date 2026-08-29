const Joi = require("joi");

const { COIN_PACKAGE_STATUS, MAX_PAGE_SIZE } = require("./coinPackage.constants");

const createCoinPackageSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required(),

  description: Joi.string()
    .trim()
    .max(500)
    .allow("", null)
    .optional(),

  coins: Joi.number()
    .integer()
    .min(1)
    .required(),

  bonusCoins: Joi.number()
    .integer()
    .min(0)
    .default(0),

  price: Joi.number()
    .precision(2)
    .min(0)
    .required(),

  currency: Joi.string()
    .trim()
    .uppercase()
    .length(3)
    .default("INR"),

  isPopular: Joi.boolean()
    .default(false),

  sortOrder: Joi.number()
    .integer()
    .min(0)
    .default(0),

  status: Joi.string()
    .valid(...Object.values(COIN_PACKAGE_STATUS))
    .default(COIN_PACKAGE_STATUS.ACTIVE),
});

const updateCoinPackageSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .optional(),

  description: Joi.string()
    .trim()
    .max(500)
    .allow("", null)
    .optional(),

  coins: Joi.number()
    .integer()
    .min(1)
    .optional(),

  bonusCoins: Joi.number()
    .integer()
    .min(0)
    .optional(),

  price: Joi.number()
    .precision(2)
    .min(0)
    .optional(),

  currency: Joi.string()
    .trim()
    .uppercase()
    .length(3)
    .optional(),

  isPopular: Joi.boolean()
    .optional(),

  sortOrder: Joi.number()
    .integer()
    .min(0)
    .optional(),

  status: Joi.string()
    .valid(...Object.values(COIN_PACKAGE_STATUS))
    .optional(),
}).min(1);

const listCoinPackagesSchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(MAX_PAGE_SIZE)
    .default(20),

  search: Joi.string()
    .trim()
    .max(100)
    .optional(),

  status: Joi.string()
    .valid(...Object.values(COIN_PACKAGE_STATUS))
    .optional(),
});

const updateStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(COIN_PACKAGE_STATUS))
    .required(),
});

const updatePopularSchema = Joi.object({
  isPopular: Joi.boolean()
    .required(),
});

const reorderCoinPackagesSchema = Joi.object({
  packages: Joi.array()
    .items(
      Joi.object({
        id: Joi.number()
          .integer()
          .positive()
          .required(),

        sortOrder: Joi.number()
          .integer()
          .min(0)
          .required(),
      })
    )
    .min(1)
    .required(),
});

module.exports = {
  createCoinPackageSchema,
  updateCoinPackageSchema,
  listCoinPackagesSchema,
  updateStatusSchema,
  updatePopularSchema,
  reorderCoinPackagesSchema,
};