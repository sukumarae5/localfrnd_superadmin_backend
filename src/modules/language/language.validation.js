const Joi = require("joi");
const { LANGUAGE_TYPE_VALUES } = require("./language.constant");

const createLanguageSchema = Joi.object({
  code: Joi.string().trim().lowercase().min(2).max(10).required().messages({
    "any.required": "Language code is required (e.g. 'en', 'hi', 'te')",
  }),
  name: Joi.string().trim().min(2).max(50).required().messages({
    "any.required": "Language name is required (e.g. 'English', 'Hindi', 'Telugu')",
  }),
  nativeName: Joi.string().trim().min(1).max(50).allow(null, "").optional(),
  type: Joi.string().valid(...LANGUAGE_TYPE_VALUES).optional(),
  isActive: Joi.boolean().optional(),
  isDefault: Joi.boolean().optional(),
  supportsVoiceCalls: Joi.boolean().optional(),
  supportsVideoCalls: Joi.boolean().optional(),
  supportsOnboarding: Joi.boolean().optional(),
  supportsInAppChat: Joi.boolean().optional(),
});

const updateLanguageSchema = Joi.object({
  code: Joi.string().trim().lowercase().min(2).max(10).optional(),
  name: Joi.string().trim().min(2).max(50).optional(),
  nativeName: Joi.string().trim().min(1).max(50).allow(null, "").optional(),
  type: Joi.string().valid(...LANGUAGE_TYPE_VALUES).optional(),
  isActive: Joi.boolean().optional(),
  isDefault: Joi.boolean().optional(),
  supportsVoiceCalls: Joi.boolean().optional(),
  supportsVideoCalls: Joi.boolean().optional(),
  supportsOnboarding: Joi.boolean().optional(),
  supportsInAppChat: Joi.boolean().optional(),
}).min(1);

// For the dedicated Deactivate / Activate button in the details panel
const updateStatusSchema = Joi.object({
  isActive: Joi.boolean().required(),
});

module.exports = { createLanguageSchema, updateLanguageSchema, updateStatusSchema };
