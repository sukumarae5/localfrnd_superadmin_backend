const Joi = require("joi");

const selectLifestylesSchema = Joi.object({
  lifestylePublicIds: Joi.array()
    .items(
      Joi.string().uuid()
    )
    .unique()
    .required()
    .messages({
      "array.unique":
        "Duplicate lifestyle selections are not allowed",
    }),
});

module.exports = {
  selectLifestylesSchema,
};