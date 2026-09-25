const Joi = require("joi");

// Targeting a person to friend-request uses their raw User.id, matching the
// existing convention for "pick a target actor" endpoints elsewhere in this
// project (e.g. calls' POST /user/calls/direct/:rjId). Acting on a specific
// friendship record (accept/reject/cancel) uses its publicId instead,
// matching calls' sessionPublicId convention — never expose or accept the
// autoincrement friendship id itself.
const sendRequestSchema = Joi.object({
  toUserId: Joi.number().integer().positive().required(),
});

const requestPublicIdSchema = Joi.object({
  requestPublicId: Joi.string().uuid().required(),
});

const otherUserIdParamSchema = Joi.object({
  otherUserId: Joi.number().integer().positive().required(),
});

const unfriendSchema = Joi.object({
  otherUserId: Joi.number().integer().positive().required(),
});

const listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
});

module.exports = {
  sendRequestSchema,
  requestPublicIdSchema,
  otherUserIdParamSchema,
  unfriendSchema,
  listQuerySchema,
};