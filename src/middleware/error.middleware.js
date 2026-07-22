function notFoundHandler(req, res) {
  res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
}

function errorHandler(err, req, res, next) {
  console.error(err);

  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  // Common Prisma error codes
  if (err.code === "P2002") {
    statusCode = 409;
    message = `Duplicate value for field(s): ${err.meta?.target}`;
  }
  if (err.code === "P2025") {
    statusCode = 404;
    message = "Record not found";
  }
  if (err.code === "P2003") {
    statusCode = 400;
    message = "Invalid reference: related record does not exist";
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
}

module.exports = { notFoundHandler, errorHandler };
