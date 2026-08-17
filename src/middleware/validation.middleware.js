// src/middleware/validation.middleware.js
const ApiError = require("../utils/apiError.util");
const { HTTP_STATUS } = require("../constants");

function validate(schema, property = "body") {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map((d) => d.message.replace(/"/g, ""));
      return next(new ApiError(HTTP_STATUS.UNPROCESSABLE_ENTITY, "Validation failed", details));
    }

    if (property === "query") {
      // Express 5's req.query is a getter that re-parses the URL on every
      // access — it is NOT cached, so mutating the object it returns has
      // no effect on the next read. We must replace the property itself
      // with a static value so later reads (in the controller/service)
      // see the validated + defaulted data instead of the raw URL parse.
      Object.defineProperty(req, "query", {
        value,
        writable: true,
        enumerable: true,
        configurable: true,
      });
    } else {
      req[property] = value;
    }

    next();
  };
}

module.exports = validate;