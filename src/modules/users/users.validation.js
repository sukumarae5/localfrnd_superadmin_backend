// src/modules/users/users.validation.js
const Joi = require("joi");
const {
  USER_STATUSES,
  VERIFICATION_STATUSES,
  GENDERS,
  MAX_PAGE_SIZE,
} = require("./users.constants");

const createUserSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(150).required(),
  mobileCountryCode: Joi.string()
    .trim()
    .pattern(/^\+\d{1,4}$/)
    .required()
    .messages({ "string.pattern.base": "Mobile country code must look like +91" }),
  mobileNumber: Joi.string()
    .trim()
    .pattern(/^\d{6,15}$/)
    .required()
    .messages({ "string.pattern.base": "Enter a valid mobile number (digits only)" }),
  email: Joi.string().trim().lowercase().email().optional(),
  gender: Joi.string().valid(...GENDERS).required(),
  dateOfBirth: Joi.string().trim().required(),
  country: Joi.string().trim().max(100).optional(),
  state: Joi.string().trim().max(100).optional(),
  city: Joi.string().trim().max(100).optional(),
  locality: Joi.string().trim().max(150).optional(),
  languageIds: Joi.array().items(Joi.number().integer()).min(1).required(),
  bio: Joi.string().trim().max(500).allow(null).optional(),
  avatarUrl: Joi.string().uri().allow(null).optional(),
});

const updateUserSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(150).optional(),
  email: Joi.string().trim().lowercase().email().allow(null).optional(),
  gender: Joi.string().valid(...GENDERS).optional(),
  dateOfBirth: Joi.string().trim().optional(),
  country: Joi.string().trim().max(100).allow(null).optional(),
  state: Joi.string().trim().max(100).allow(null).optional(),
  city: Joi.string().trim().max(100).allow(null).optional(),
  locality: Joi.string().trim().max(150).allow(null).optional(),
  languageIds: Joi.array().items(Joi.number().integer()).min(1).optional(),
  bio: Joi.string().trim().max(500).allow(null).optional(),
  avatarUrl: Joi.string().uri().allow(null).optional(),
}).min(1);

const updateStatusSchema = Joi.object({
  status: Joi.string().valid(...USER_STATUSES).required(),
  reason: Joi.string()
    .trim()
    .max(500)
    .when("status", {
      is: Joi.valid("suspended", "blocked"),
      then: Joi.required().messages({ "any.required": "A reason is required to suspend or block a user" }),
      otherwise: Joi.optional(),
    }),
});

const addNoteSchema = Joi.object({
  note: Joi.string().trim().min(1).max(2000).required(),
});

const listUsersQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(MAX_PAGE_SIZE).optional(),
  search: Joi.string().trim().max(150).optional(),
  status: Joi.string().valid(...USER_STATUSES).optional(),
  verificationStatus: Joi.string().valid(...VERIFICATION_STATUSES).optional(),
  onlineOnly: Joi.boolean().truthy("true").falsy("false").optional(),
  sortBy: Joi.string().valid("registeredAt", "fullName", "lastActiveAt", "totalCallsCount").optional(),
  sortOrder: Joi.string().valid("asc", "desc").optional(),
});

module.exports = {
  createUserSchema,
  updateUserSchema,
  updateStatusSchema,
  addNoteSchema,
  listUsersQuerySchema,
};