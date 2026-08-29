const Joi = require("joi");
const {
  OFFER_TYPE,
  OFFER_DISCOUNT_TYPE,
  OFFER_STATUS,
  OFFER_SORT_FIELDS,
} = require("./offers.constants");

const publicIdParam = Joi.object({
  publicId: Joi.string().guid({ version: "uuidv4" }).required(),
});

const createOfferSchema = Joi.object({
  name: Joi.string().trim().min(2).max(150).required(),
  description: Joi.string().trim().max(1000).optional().allow("", null),

  offerType: Joi.string().valid(...Object.values(OFFER_TYPE)).required(),
  discountType: Joi.string().valid(...Object.values(OFFER_DISCOUNT_TYPE)).required(),
  discountValue: Joi.number().positive().precision(2).required(),

  couponCode: Joi.string().trim().uppercase().min(3).max(30).required(),

  applicableToAll: Joi.boolean().default(true),
  applicablePlanIds: Joi.array().items(Joi.number().integer().positive()).default([]),

  minPurchaseAmount: Joi.number().min(0).optional().allow(null),
  maxRedemptions: Joi.number().integer().min(1).optional().allow(null),
  maxRedemptionsPerUser: Joi.number().integer().min(1).default(1),

  status: Joi.string().valid(...Object.values(OFFER_STATUS)).optional(),
  startAt: Joi.date().iso().optional().allow(null),
  endAt: Joi.date().iso().min(Joi.ref("startAt")).optional().allow(null),
});

const updateOfferSchema = Joi.object({
  name: Joi.string().trim().min(2).max(150).optional(),
  description: Joi.string().trim().max(1000).optional().allow("", null),

  offerType: Joi.string().valid(...Object.values(OFFER_TYPE)).optional(),
  discountType: Joi.string().valid(...Object.values(OFFER_DISCOUNT_TYPE)).optional(),
  discountValue: Joi.number().positive().precision(2).optional(),

  couponCode: Joi.string().trim().uppercase().min(3).max(30).optional(),

  applicableToAll: Joi.boolean().optional(),
  applicablePlanIds: Joi.array().items(Joi.number().integer().positive()).optional(),

  minPurchaseAmount: Joi.number().min(0).optional().allow(null),
  maxRedemptions: Joi.number().integer().min(1).optional().allow(null),
  maxRedemptionsPerUser: Joi.number().integer().min(1).optional(),

  startAt: Joi.date().iso().optional().allow(null),
  endAt: Joi.date().iso().optional().allow(null),
}).min(1);

const changeStatusSchema = Joi.object({
  status: Joi.string().valid(...Object.values(OFFER_STATUS)).required(),
  note: Joi.string().trim().max(300).optional().allow(null, ""),
});

const bulkStatusSchema = Joi.object({
  publicIds: Joi.array().items(Joi.string().guid({ version: "uuidv4" })).min(1).max(100).required(),
  status: Joi.string().valid(...Object.values(OFFER_STATUS)).required(),
});

const listOffersQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  offerType: Joi.string().valid(...Object.values(OFFER_TYPE)).optional(),
  status: Joi.string().valid(...Object.values(OFFER_STATUS)).optional(),
  discountType: Joi.string().valid(...Object.values(OFFER_DISCOUNT_TYPE)).optional(),
  search: Joi.string().trim().max(150).optional().allow(""),
  dateFrom: Joi.date().iso().optional(),
  dateTo: Joi.date().iso().optional(),
  sortBy: Joi.string().valid(...OFFER_SORT_FIELDS).default("createdAt"),
  sortOrder: Joi.string().valid("asc", "desc").default("desc"),
});

module.exports = {
  publicIdParam,
  createOfferSchema,
  updateOfferSchema,
  changeStatusSchema,
  bulkStatusSchema,
  listOffersQuerySchema,
};