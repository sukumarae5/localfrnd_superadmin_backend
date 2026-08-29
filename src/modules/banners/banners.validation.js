const Joi = require("joi");
const {
  BANNER_TYPE,
  BANNER_CATEGORY,
  BANNER_POSITION,
  BANNER_PLATFORM,
  BANNER_AUDIENCE,
  BANNER_STATUS,
} = require("./banners.constants");

const publicIdParam = Joi.object({
  publicId: Joi.string().guid({ version: "uuidv4" }).required(),
});

const createBannerSchema = Joi.object({
  title: Joi.string().trim().min(2).max(150).required(),

  bannerType: Joi.string()
    .valid(...Object.values(BANNER_TYPE))
    .required(),

  category: Joi.string()
    .valid(...Object.values(BANNER_CATEGORY))
    .default(BANNER_CATEGORY.OTHER),

  // Required for HOME banners (top slider / middle / bottom), optional for PROMOTIONAL
  position: Joi.string()
    .valid(...Object.values(BANNER_POSITION))
    .when("bannerType", {
      is: BANNER_TYPE.HOME,
      then: Joi.required(),
      otherwise: Joi.optional().allow(null),
    }),

  platforms: Joi.array()
    .items(Joi.string().valid(...Object.values(BANNER_PLATFORM)))
    .min(1)
    .default([BANNER_PLATFORM.ANDROID, BANNER_PLATFORM.IOS]),

  audience: Joi.string()
    .valid(...Object.values(BANNER_AUDIENCE))
    .default(BANNER_AUDIENCE.ALL_USERS),

  audienceFilterDays: Joi.number().integer().min(1).max(365).optional().allow(null),

  region: Joi.string().trim().max(100).default("GLOBAL"),

  deepLink: Joi.string().trim().max(500).optional().allow(null, ""),
  campaignValue: Joi.string().trim().max(150).optional().allow(null, ""),

  priority: Joi.number().integer().min(1).max(10).default(5),
  status: Joi.string().valid(...Object.values(BANNER_STATUS)).default(BANNER_STATUS.DRAFT),

  startAt: Joi.date().iso().optional().allow(null),
  endAt: Joi.date().iso().min(Joi.ref("startAt")).optional().allow(null),
});

const updateBannerSchema = createBannerSchema.fork(
  ["title", "bannerType", "platforms", "audience", "category", "priority", "status", "region"],
  (schema) => schema.optional()
);

const changeStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(BANNER_STATUS))
    .required(),
  note: Joi.string().trim().max(300).optional().allow(null, ""),
});

const changePrioritySchema = Joi.object({
  priority: Joi.number().integer().min(1).max(10).required(),
});

const scheduleSchema = Joi.object({
  startAt: Joi.date().iso().required(),
  endAt: Joi.date().iso().min(Joi.ref("startAt")).required(),
});

const approveAssetsSchema = Joi.object({
  note: Joi.string().trim().max(300).optional().allow(null, ""),
});

const bulkStatusSchema = Joi.object({
  publicIds: Joi.array()
    .items(Joi.string().guid({ version: "uuidv4" }))
    .min(1)
    .max(100)
    .required(),
  status: Joi.string().valid(...Object.values(BANNER_STATUS)).required(),
});

const bulkDeleteSchema = Joi.object({
  publicIds: Joi.array()
    .items(Joi.string().guid({ version: "uuidv4" }))
    .min(1)
    .max(100)
    .required(),
});

const listBannersQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  bannerType: Joi.string().valid(...Object.values(BANNER_TYPE)).optional(),
  category: Joi.string().valid(...Object.values(BANNER_CATEGORY)).optional(),
  status: Joi.string().valid(...Object.values(BANNER_STATUS)).optional(),
  platform: Joi.string().valid(...Object.values(BANNER_PLATFORM)).optional(),
  position: Joi.string().valid(...Object.values(BANNER_POSITION)).optional(),
  search: Joi.string().trim().max(150).optional().allow(""),
  dateFrom: Joi.date().iso().optional(),
  dateTo: Joi.date().iso().optional(),
  sortBy: Joi.string()
    .valid("createdAt", "priority", "startAt", "endAt", "clicksCount", "impressionsCount")
    .default("priority"),
  sortOrder: Joi.string().valid("asc", "desc").default("asc"),
});

const statsQuerySchema = Joi.object({
  bannerType: Joi.string().valid(...Object.values(BANNER_TYPE)).optional(),
  limit: Joi.number().integer().min(1).max(20).default(5),
});

// Mobile-facing
const activeBannersQuerySchema = Joi.object({
  bannerType: Joi.string().valid(...Object.values(BANNER_TYPE)).default(BANNER_TYPE.HOME),
  platform: Joi.string().valid(...Object.values(BANNER_PLATFORM)).required(),
  position: Joi.string().valid(...Object.values(BANNER_POSITION)).optional(),
});

module.exports = {
  publicIdParam,
  createBannerSchema,
  updateBannerSchema,
  changeStatusSchema,
  changePrioritySchema,
  scheduleSchema,
  approveAssetsSchema,
  bulkStatusSchema,
  bulkDeleteSchema,
  listBannersQuerySchema,
  statsQuerySchema,
  activeBannersQuerySchema,
};