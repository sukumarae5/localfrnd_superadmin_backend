const Joi = require("joi");

const otherUserIdParamSchema = Joi.object({
  otherUserId: Joi.number().integer().positive().required(),
});

const messagesQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).optional(),
  offset: Joi.number().integer().min(0).optional(),
});

const conversationIdParamSchema = Joi.object({
  conversationId: Joi.number().integer().positive().required(),
});

const messageIdParamSchema = Joi.object({
  messageId: Joi.number().integer().positive().required(),
});

module.exports = {
  otherUserIdParamSchema,
  messagesQuerySchema,
  conversationIdParamSchema,
  messageIdParamSchema,
};