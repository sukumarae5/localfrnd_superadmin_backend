const Joi = require("joi");

const publicIdParamSchema = Joi.object({
  publicId: Joi.string().uuid().required(),
});

const createSchema = Joi.object({
  categoryPublicId: Joi.string()
    .uuid()
    .required(),

  name: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required(),

  description: Joi.string()
    .trim()
    .max(1000)
    .allow("", null),

  sortOrder: Joi.number()
    .integer()
    .min(0)
    .default(0),

  status: Joi.string()
    .valid(
      "active",
      "inactive",
      "draft",
      "hidden"
    )
    .default("active"),
});

const updateSchema = Joi.object({
  categoryPublicId: Joi.string()
    .uuid(),

  name: Joi.string()
    .trim()
    .min(1)
    .max(100),

  description: Joi.string()
    .trim()
    .max(1000)
    .allow("", null),

  sortOrder: Joi.number()
    .integer()
    .min(0),

  status: Joi.string()
    .valid(
      "active",
      "inactive",
      "draft",
      "hidden"
    ),
}).min(1);

const listQuerySchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10),

  categoryPublicId: Joi.string()
    .uuid(),

  status: Joi.string()
    .valid(
      "active",
      "inactive",
      "draft",
      "hidden"
    ),

  search: Joi.string()
    .trim()
    .max(100)
    .allow(""),

  sortBy: Joi.string()
    .valid(
      "name",
      "createdAt",
      "sortOrder"
    )
    .default("sortOrder"),

  sortDir: Joi.string()
    .valid("asc", "desc")
    .default("asc"),
});

module.exports = {
  publicIdParamSchema,
  createSchema,
  updateSchema,
  listQuerySchema,
};