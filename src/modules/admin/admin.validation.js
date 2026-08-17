const Joi = require("joi");

const createAdminSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(150).required(),
  email: Joi.string().trim().lowercase().email().required(),
  password: Joi.string().min(8).required().messages({
    "string.min": "Password must be at least 8 characters",
  }),
  roleCode: Joi.string().trim().required().messages({
    "any.required": "roleCode is required (e.g. 'super_admin', 'admin', 'support')",
  }),
  avatarUrl: Joi.string().uri().optional().allow(null, ""),
});

const updateAdminSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(150).optional(),
  roleCode: Joi.string().trim().optional(),
  status: Joi.string().valid("active", "inactive", "locked").optional(),
  avatarUrl: Joi.string().uri().optional().allow(null, ""),
}).min(1);

const changeOwnPasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).required(),
  confirmPassword: Joi.string().valid(Joi.ref("newPassword")).required().messages({
    "any.only": "confirmPassword must match newPassword",
  }),
});

const resetAdminPasswordSchema = Joi.object({
  newPassword: Joi.string().min(8).required(),
});

module.exports = {
  createAdminSchema,
  updateAdminSchema,
  changeOwnPasswordSchema,
  resetAdminPasswordSchema,
};