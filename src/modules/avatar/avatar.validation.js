// src/modules/avatar/avatar.validation.js
const Joi = require("joi");
const { AVATAR_GENDERS, MAX_PAGE_SIZE } = require("./avatar.constants");

const listAvatarsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(MAX_PAGE_SIZE).optional(),
  search: Joi.string().trim().max(150).optional(),
  gender: Joi.string().valid(...AVATAR_GENDERS).optional(),
  isActive: Joi.boolean().truthy("true").falsy("false").optional(),
});

const createAvatarSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  gender: Joi.string().valid(...AVATAR_GENDERS).required(),
  sortOrder: Joi.number().integer().min(0).optional(),
});

const updateAvatarSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).optional(),
  gender: Joi.string().valid(...AVATAR_GENDERS).optional(),
  sortOrder: Joi.number().integer().min(0).optional(),
  isActive: Joi.boolean().optional(),
}).min(1);

module.exports = { listAvatarsQuerySchema, createAvatarSchema, updateAvatarSchema };