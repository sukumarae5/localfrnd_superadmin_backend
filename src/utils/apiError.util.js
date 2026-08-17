// src/utils/apiError.util.js

// Thrown from controllers, e.g. `throw new ApiError(401, "Invalid credentials")`.
// Caught by error.middleware.js's errorHandler and turned into a JSON response.
class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true; // marks this as an "expected" error, not a bug
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ApiError;