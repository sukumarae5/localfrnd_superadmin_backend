const Joi = require("joi");

const assignSchema = Joi.object({
  rjId: Joi.number().integer().positive().required(),
  interestCategoryPublicId: Joi.string().uuid().required(),
});

const rjIdParamSchema = Joi.object({
  rjId: Joi.number().integer().positive().required(),
  categoryPublicId: Joi.string().uuid().required(),
});

const categoryParamSchema = Joi.object({
  categoryPublicId: Joi.string().uuid().required(),
});

const listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});

const selfSelectSchema = Joi.object({
  interestCategoryPublicIds: Joi.array().items(Joi.string().uuid()).min(1).required(),
});

const recommendationsQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(50).default(10),
});

module.exports = {
  assignSchema,
  rjIdParamSchema,
  categoryParamSchema,
  listQuerySchema,
  selfSelectSchema,
  recommendationsQuerySchema,
};