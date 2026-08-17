const Joi = require("joi");

const createSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  description: Joi.string().trim().max(1000).allow("", null),
  icon: Joi.string().trim().max(255).allow("", null),
  type: Joi.string().trim().max(50).default("General"),
  status: Joi.string().valid("active", "hidden", "draft", "inactive").default("draft"),
  visibility: Joi.string().valid("public", "private").default("public"),
  isFeatured: Joi.boolean().default(false),
  isTrending: Joi.boolean().default(false),
  recommendationScore: Joi.number().integer().min(0).max(100).default(0),
  popularity: Joi.string().valid("low", "medium", "high"),
  tags: Joi.array().items(Joi.string().trim().max(30)).default([]),
  sortOrder: Joi.number().integer().min(0).default(0),
  languageIds: Joi.array().items(Joi.number().integer().positive()).default([]),
});

const updateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  description: Joi.string().trim().max(1000).allow("", null),
  icon: Joi.string().trim().max(255).allow("", null),
  type: Joi.string().trim().max(50),
  status: Joi.string().valid("active", "hidden", "draft", "inactive"),
  visibility: Joi.string().valid("public", "private"),
  isFeatured: Joi.boolean(),
  isTrending: Joi.boolean(),
  recommendationScore: Joi.number().integer().min(0).max(100),
  popularity: Joi.string().valid("low", "medium", "high"),
  tags: Joi.array().items(Joi.string().trim().max(30)),
  sortOrder: Joi.number().integer().min(0),
  languageIds: Joi.array().items(Joi.number().integer().positive()),
}).min(1);

const listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  status: Joi.string().valid("active", "hidden", "draft", "inactive"),
  type: Joi.string().trim(),
  visibility: Joi.string().valid("public", "private"),
  languageId: Joi.number().integer().positive(),
  isFeatured: Joi.boolean(),
  isTrending: Joi.boolean(),
  search: Joi.string().trim().max(100).allow(""),
  sortBy: Joi.string().valid("name", "createdAt", "recommendationScore", "sortOrder").default("sortOrder"),
  sortDir: Joi.string().valid("asc", "desc").default("asc"),
});

const publicIdParamSchema = Joi.object({
  publicId: Joi.string().uuid().required(),
});

module.exports = { createSchema, updateSchema, listQuerySchema, publicIdParamSchema };
