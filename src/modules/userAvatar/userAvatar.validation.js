// src/modules/userAvatar/userAvatar.validation.js
const Joi = require("joi");

const listUserAvatarsQuerySchema = Joi.object({
  gender: Joi.string().valid("male", "female").required(),
});

const selectAvatarSchema = Joi.object({
  avatarId: Joi.number().integer().positive().required(),
});

module.exports = { listUserAvatarsQuerySchema, selectAvatarSchema };