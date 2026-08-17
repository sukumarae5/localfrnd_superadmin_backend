// src/middleware/error.middleware.js
const ApiError = require("../utils/apiError.util");
const { HTTP_STATUS } = require("../constants");

// Catches any request that didn't match a route (mounted after all routes in app.js)
function notFoundHandler(req, res, next) {
  next(new ApiError(HTTP_STATUS.NOT_FOUND, `Route not found: ${req.method} ${req.originalUrl}`));
}

// Final error handler — must be registered LAST in app.js (4 args = Express error middleware)
function errorHandler(err, req, res, next) {
   console.error("========== ERROR ==========");
  console.error("Status:", err.statusCode);
  console.error("Message:", err.message);
  console.error(err);
  
  let statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let message = err.message || "Internal server error";
  const details = err.details || null;

  // Translate common Prisma error codes into friendly, safe messages
  if (err.code === "P2002") {
    statusCode = HTTP_STATUS.CONFLICT;
    const field = err.meta?.target?.join(", ") || "field";
    message = `A record with this ${field} already exists`;
  } else if (err.code === "P2025") {
    statusCode = HTTP_STATUS.NOT_FOUND;
    message = "Record not found";
  } else if (err.code === "P2003") {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = "Invalid reference to a related record";
  }

  // Never leak internal error details for unexpected (non-operational) errors
  if (statusCode === HTTP_STATUS.INTERNAL_SERVER_ERROR) {
    console.error("Unexpected error:", err);
    if (process.env.NODE_ENV === "production") {
      message = "Internal server error";
    }
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(details ? { details } : {}),
  });
}

module.exports = { notFoundHandler, errorHandler };