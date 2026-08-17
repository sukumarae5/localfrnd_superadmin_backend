const Joi = require("joi");

const selectInterestsSchema = Joi.object({
  interestCategoryPublicIds: Joi.array()
    .items(Joi.string().uuid())
    .min(3)
    .required()
    .messages({ "array.min": "Select at least 3 interest categories" }),
});

module.exports = { selectInterestsSchema };