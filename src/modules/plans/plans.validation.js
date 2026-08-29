const Joi = require("joi");
const { PLAN_TYPE, PLAN_SORT_FIELDS } = require("./plans.constants");

const publicIdParam = Joi.object({
  publicId: Joi.string().guid({ version: "uuidv4" }).required(),
});

const createPlanSchema = Joi.object({
  code: Joi.string().trim().uppercase().max(30).required(),
  displayName: Joi.string().trim().max(50).required(),

  shortDescription: Joi.string().trim().max(200).optional().allow("", null),
  detailedDescription: Joi.string().trim().max(2000).optional().allow("", null),
  planType: Joi.string().valid(...Object.values(PLAN_TYPE)).default(PLAN_TYPE.NORMAL),
  badgeText: Joi.string().trim().max(40).optional().allow("", null),
  themeColor: Joi.string().trim().pattern(/^#[0-9A-Fa-f]{6,8}$/).optional().allow("", null),

  baseCoins: Joi.number().integer().min(0).required(),
  bonusCoins: Joi.number().integer().min(0).default(0),
  minutes: Joi.number().integer().min(0).default(0),
  validityDays: Joi.number().integer().min(1).max(3650).optional().allow(null),

  originalPrice: Joi.number().positive().precision(2).required(),
  discountPercent: Joi.number().integer().min(0).max(100).default(0),

  displayPriority: Joi.number().integer().min(1).max(999).default(1),
  isFeatured: Joi.boolean().default(false),
  isPremiumBadge: Joi.boolean().default(false),
  cashbackEnabled: Joi.boolean().default(false),
  isActive: Joi.boolean().optional(),
  isDraft: Joi.boolean().default(false),
  features: Joi.object().optional(),
});

const updatePlanSchema = Joi.object({
  displayName: Joi.string().trim().max(50).optional(),
  shortDescription: Joi.string().trim().max(200).optional().allow("", null),
  detailedDescription: Joi.string().trim().max(2000).optional().allow("", null),
  planType: Joi.string().valid(...Object.values(PLAN_TYPE)).optional(),
  badgeText: Joi.string().trim().max(40).optional().allow("", null),
  themeColor: Joi.string().trim().pattern(/^#[0-9A-Fa-f]{6,8}$/).optional().allow("", null),

  baseCoins: Joi.number().integer().min(0).optional(),
  bonusCoins: Joi.number().integer().min(0).optional(),
  minutes: Joi.number().integer().min(0).optional(),
  validityDays: Joi.number().integer().min(1).max(3650).optional().allow(null),

  originalPrice: Joi.number().positive().precision(2).optional(),
  discountPercent: Joi.number().integer().min(0).max(100).optional(),

  displayPriority: Joi.number().integer().min(1).max(999).optional(),
  isFeatured: Joi.boolean().optional(),
  isPremiumBadge: Joi.boolean().optional(),
  cashbackEnabled: Joi.boolean().optional(),
  features: Joi.object().optional(),
}).min(1);

const setPlanActiveSchema = Joi.object({
  isActive: Joi.boolean().required(),
});

const listPlansQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  isActive: Joi.boolean().truthy("true").falsy("false").optional(),
  isDraft: Joi.boolean().truthy("true").falsy("false").optional(),
  planType: Joi.string().valid(...Object.values(PLAN_TYPE)).optional(),
  search: Joi.string().trim().max(150).optional().allow(""),
  minPrice: Joi.number().min(0).optional(),
  maxPrice: Joi.number().min(0).optional(),
  minCoins: Joi.number().integer().min(0).optional(),
  maxCoins: Joi.number().integer().min(0).optional(),
  validityDays: Joi.number().integer().min(1).optional(),
  sortBy: Joi.string().valid(...PLAN_SORT_FIELDS).default("displayPriority"),
  sortOrder: Joi.string().valid("asc", "desc").default("asc"),
});

const purchasePlanSchema = Joi.object({
  userId: Joi.number().integer().positive().required(),
  planPublicId: Joi.string().guid({ version: "uuidv4" }).required(),
  couponCode: Joi.string().trim().uppercase().max(30).optional().allow("", null),
  paymentMethod: Joi.string().valid("upi", "credit_card", "wallet", "other").optional(),
});

const refundPurchaseSchema = Joi.object({
  subscriptionId: Joi.number().integer().positive().required(),
});

const assignSubscriptionSchema = Joi.object({
  userId: Joi.number().integer().positive().required(),
  planId: Joi.number().integer().positive().required(),
  expiresAt: Joi.date().iso().allow(null).optional(),
});

const listSubscriptionsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  userId: Joi.number().integer().positive().optional(),
  planId: Joi.number().integer().positive().optional(),
  isCurrent: Joi.boolean().truthy("true").falsy("false").optional(),
});

module.exports = {
  publicIdParam,
  createPlanSchema,
  updatePlanSchema,
  setPlanActiveSchema,
  listPlansQuerySchema,
  purchasePlanSchema,
  refundPurchaseSchema,
  assignSubscriptionSchema,
  listSubscriptionsQuerySchema,
};