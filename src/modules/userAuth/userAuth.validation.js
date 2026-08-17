const Joi = require("joi");

// Matches your User model: mobileCountryCode + mobileNumber stored separately,
// unique together as `uq_users_mobile`. Supports international numbers.
const sendOtpSchema = Joi.object({
  mobileCountryCode: Joi.string()
    .pattern(/^\+\d{1,4}$/)
    .required()
    .messages({
      "string.pattern.base": "Country code must look like +91",
      "any.required": "Country code is required",
    }),
  mobileNumber: Joi.string()
    .pattern(/^\d{6,14}$/)
    .required()
    .messages({
      "string.pattern.base": "Enter a valid mobile number",
      "any.required": "Mobile number is required",
    }),
});

const verifyOtpSchema = sendOtpSchema.keys({
  otp: Joi.string()
    .length(6)
    .pattern(/^\d+$/)
    .required()
    .messages({
      "string.length": "OTP must be 6 digits",
      "string.pattern.base": "OTP must contain only digits",
      "any.required": "OTP is required",
    }),
});

module.exports = { sendOtpSchema, verifyOtpSchema };